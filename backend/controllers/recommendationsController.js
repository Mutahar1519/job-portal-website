const db = require("../config/mysql");

/**
 * Score a single job against a user profile.
 * Returns a number 0–100.
 */
const scoreJob = (job, profile, alertCategories, alertKeywords) => {
  let score = 0;

  // ── Category match (30 pts) ─────────────────────────────────────────────
  const jobCategory = (job.category || "").toLowerCase();
  if (alertCategories.length) {
    const catMatch = alertCategories.some(c => jobCategory.includes(c.toLowerCase()) || c.toLowerCase().includes(jobCategory));
    if (catMatch) score += 30;
  } else if (profile.job_title) {
    const titleWords = profile.job_title.toLowerCase().split(/\s+/);
    if (titleWords.some(w => w.length > 2 && jobCategory.includes(w))) score += 15;
  }

  // ── Job type match (20 pts) ─────────────────────────────────────────────
  const preferredType = (profile.preferred_job_type || "").toLowerCase();
  const jobType = (job.job_type || "").toLowerCase();
  if (preferredType && jobType && preferredType === jobType) score += 20;

  // ── Location / remote match (20 pts) ───────────────────────────────────
  const profileLocation = (profile.location || profile.city || "").toLowerCase();
  const jobLocation = (job.location || "").toLowerCase();
  if (job.is_remote) {
    score += 15; // remote jobs are accessible to everyone
  } else if (profileLocation && jobLocation) {
    if (jobLocation.includes(profileLocation) || profileLocation.includes(jobLocation)) {
      score += 20;
    } else if (profile.country) {
      const country = profile.country.toLowerCase();
      if (jobLocation.includes(country)) score += 8;
    }
  }

  // ── Skills keyword overlap (15 pts) ────────────────────────────────────
  if (profile.skills) {
    const skills = profile.skills.toLowerCase().split(/[,;|\n]+/).map(s => s.trim()).filter(s => s.length > 2);
    const jobText = `${job.title} ${job.description || ""}`.toLowerCase();
    const matchedSkills = skills.filter(skill => jobText.includes(skill));
    const skillScore = Math.min(15, Math.round((matchedSkills.length / Math.max(skills.length, 1)) * 15 * 2));
    score += skillScore;
  }

  // ── Alert keyword match bonus (10 pts) ─────────────────────────────────
  if (alertKeywords.length) {
    const jobText = `${job.title} ${job.description || ""}`.toLowerCase();
    const kwMatch = alertKeywords.some(kw => kw && jobText.includes(kw.toLowerCase()));
    if (kwMatch) score += 10;
  }

  // ── Experience level match (10 pts) ────────────────────────────────────
  const expYears = Number(profile.experience_years) || 0;
  const expLevel = (job.experience_level || "").toLowerCase();
  if (expLevel) {
    const bracket =
      expYears <= 1 ? "entry" :
      expYears <= 3 ? "junior" :
      expYears <= 6 ? "mid" :
      expYears <= 10 ? "senior" :
      "lead";
    if (
      (bracket === "entry" && expLevel.includes("entry")) ||
      (bracket === "junior" && expLevel.includes("junior")) ||
      (bracket === "mid" && (expLevel.includes("mid") || expLevel.includes("associate"))) ||
      (bracket === "senior" && expLevel.includes("senior")) ||
      (bracket === "lead" && (expLevel.includes("lead") || expLevel.includes("executive") || expLevel.includes("principal")))
    ) {
      score += 10;
    }
  }

  // ── Freshness bonus (5 pts) ─────────────────────────────────────────────
  if (job.created_at) {
    const ageMs = Date.now() - new Date(job.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays <= 3) score += 5;
    else if (ageDays <= 7) score += 3;
    else if (ageDays <= 14) score += 1;
  }

  // ── Premium bump (not weighted — just a tiebreaker) ────────────────────
  if (job.is_premium) score += 2;

  return Math.min(100, score);
};

/**
 * GET /api/recommendations
 * Returns up to `limit` recommended jobs for the authenticated user.
 * Query params: limit (default 10, max 50)
 */
exports.getRecommendations = (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

  // 1. Load user profile + job alerts in parallel
  const profileSql = `
    SELECT u.city, u.country, p.skills, p.location, p.job_title,
           p.experience_years, p.preferred_job_type
    FROM users u
    LEFT JOIN job_seeker_profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `;

  const alertsSql = `
    SELECT keyword, category, job_type, location
    FROM job_alerts
    WHERE user_id = ? AND is_active = 1
  `;

  const appliedSql = `
    SELECT job_id FROM applications WHERE user_id = ?
  `;

  db.query(profileSql, [userId], (err, profileRows) => {
    if (err) return res.status(500).json({ message: "DB error", error: err.message });

    const profile = profileRows[0] || {};

    db.query(alertsSql, [userId], (err2, alerts) => {
      if (err2) return res.status(500).json({ message: "DB error", error: err2.message });

      db.query(appliedSql, [userId], (err3, appliedRows) => {
        if (err3) return res.status(500).json({ message: "DB error", error: err3.message });

        const appliedIds = new Set(appliedRows.map(r => r.job_id));
        const alertCategories = [...new Set(alerts.map(a => a.category).filter(Boolean))];
        const alertKeywords = [...new Set(alerts.map(a => a.keyword).filter(Boolean))];

        // 2. Fetch recent approved jobs (exclude already applied, exclude shifts for recommendations)
        const jobsSql = `
          SELECT j.id, j.title, j.location, j.job_type, j.category, j.description,
                 j.salary_min, j.salary_max, j.experience_level, j.is_remote,
                 j.is_premium, j.is_shift, j.created_at, j.company_id,
                 j.application_deadline,
                 c.name AS company_name, c.logo_url AS company_logo
          FROM jobs j
          LEFT JOIN companies c ON c.id = j.company_id
          WHERE j.is_approved = 1
            AND j.moderation_status IN ('approved', 'auto_approved')
            AND (j.application_deadline IS NULL OR j.application_deadline > NOW())
          ORDER BY j.created_at DESC
          LIMIT 500
        `;

        db.query(jobsSql, [], (err4, jobs) => {
          if (err4) return res.status(500).json({ message: "DB error", error: err4.message });

          // 3. Score and sort
          const scored = jobs
            .filter(job => !appliedIds.has(job.id))
            .map(job => ({ ...job, _score: scoreJob(job, profile, alertCategories, alertKeywords) }))
            .filter(job => job._score > 0)
            .sort((a, b) => b._score - a._score || b.is_premium - a.is_premium)
            .slice(0, limit)
            .map(({ _score, ...job }) => ({ ...job, match_score: _score }));

          res.json(scored);
        });
      });
    });
  });
};

/**
 * GET /api/recommendations/count
 * Returns the count of recommendations (used for badge indicators).
 */
exports.getRecommendationCount = (req, res) => {
  const userId = req.user.id;

  // Lightweight version — just count without full scoring
  const profileSql = `
    SELECT p.skills, p.location, p.job_title, p.preferred_job_type, u.city
    FROM users u
    LEFT JOIN job_seeker_profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `;

  db.query(profileSql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    const hasProfile = rows[0] && (rows[0].skills || rows[0].job_title || rows[0].preferred_job_type);
    // Return a rough estimate — if profile exists, real count comes from full endpoint
    res.json({ has_profile: !!hasProfile });
  });
};
