document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("jobs");
  if (!container) return;

  try {
    container.innerHTML = Array.from({ length: 6 })
      .map(() => "<div class=\"skeleton-card\"></div>")
      .join("");

    const res = await authFetch(`${API}/jobs`);
    const jobs = await res.json();

    container.innerHTML = "";

    if (!jobs.length) {
      container.innerHTML = "<p class=\"empty-state\">No jobs found yet.</p>";
      return;
    }

      jobs.forEach(job => {
        const matchScore = getMatchScore(job);
        const premiumBadge = job.is_premium
          ? '<span class="badge badge-premium">Premium</span>'
          : "";
        const shiftBadge = job.is_shift
          ? '<span class="badge badge-shift">Shift</span>'
          : "";
        const verifiedBadge = job.company_name
          ? '<span class="badge badge-verified">Verified</span>'
          : "";
        const premiumClass = job.is_premium ? "premium-job" : "";
        const jobType = job.job_type || job.jobType || "";
        const companyBadge = job.company_name && job.company_id
          ? `
            <div class="company-badge">
              ${job.company_logo ? `<img class="company-logo-img" src="${job.company_logo}" alt="${job.company_name}" />` : ""}
              <a class="company-link" href="company.html?companyId=${job.company_id}">${job.company_name}</a>
            </div>
          `
          : "";

      container.innerHTML += `
        <div class="job-card ${premiumClass}">
          <div class="job-card-top">
            <div>
              <h3>${job.title}</h3>
              <div class="job-meta">
                <span class="meta-item">${job.location || ""}</span>
                ${jobType ? `<span class="meta-item">${jobType}</span>` : ""}
              </div>
              ${companyBadge}
            </div>
            <div class="job-card-badges">
              ${premiumBadge}
              ${shiftBadge}
              ${verifiedBadge}
              <span class="match-pill">${matchScore}% Match</span>
            </div>
          </div>
          <p class="job-desc">${job.description || ""}</p>
          <div class="job-card-actions">
            <a href="job.html?jobId=${job.id}&id=${job.id}" class="btn btn-ghost" data-job-id="${job.id}">Details</a>
            <a href="apply.html?jobId=${job.id}" class="apply-btn" data-job-id="${job.id}">Apply</a>
          </div>
        </div>
      `;
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p class=\"empty-state\">Error loading jobs.</p>";
  }
});

const getJobSearchState = () => {
  const raw = localStorage.getItem("jobSearchState");
  if (!raw) return {};
  try {
    return JSON.parse(raw) || {};
  } catch (err) {
    console.error("Invalid JSON in localStorage.jobSearchState", err);
    localStorage.removeItem("jobSearchState");
    return {};
  }
};

const getMatchScore = (job) => {
  const state = getJobSearchState();

  let score = 62;
  const title = (job.title || "").toLowerCase();
  const location = (job.location || "").toLowerCase();
  const category = (job.category || "").toLowerCase();

  if (state.q && title.includes(state.q.toLowerCase())) score += 15;
  if (state.category && category === state.category.toLowerCase()) score += 10;
  if (state.location && location.includes(state.location.toLowerCase())) score += 8;
  if (state.remoteOnly && (location.includes("remote") || location.includes("hybrid"))) score += 8;
  if (job.is_premium) score += 3;
  if (job.is_shift) score += 4;

  return Math.min(98, Math.max(55, score));
};
