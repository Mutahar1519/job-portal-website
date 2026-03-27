document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const rawJobId = params.get("jobId") || params.get("id") || sessionStorage.getItem("lastJobId") || "";
  const jobId = Number(rawJobId);

  const titleEl = document.getElementById("jobDetailTitle");
  const metaEl = document.getElementById("jobDetailMeta");
  const companyEl = document.getElementById("jobDetailCompany");
  const companyAvatarEl = document.getElementById("jobDetailCompanyAvatar");
  const badgeEl = document.getElementById("jobDetailBadges");
  const infoListEl = document.getElementById("jobDetailInfoList");
  const tagsEl = document.getElementById("jobDetailTags");
  const descEl = document.getElementById("jobDetailDescription");
  const applyBtn = document.getElementById("jobDetailApply");
  const saveBtn = document.getElementById("jobDetailSave");
  const saveTopBtn = document.getElementById("jobDetailBookmark");
  const shareBtn = document.getElementById("jobDetailShare");
  const similarEl = document.getElementById("jobDetailSimilar");
  const highlightsEl = document.getElementById("jobDetailHighlights");
  const companyReviewsEl = document.getElementById("jobCompanyReviews");
  const companyReviewForm = document.getElementById("jobCompanyReviewForm");

  if (!jobId) {
    if (titleEl) titleEl.textContent = "Job not found";
    if (descEl) descEl.textContent = "Missing job reference. Please return to jobs and open details again.";
    return;
  }

  const setText = (el, text) => {
    if (el) el.textContent = text || "";
  };

  const escapeHtml = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const fetchJobById = async (id) => {
    const primary = await authFetch(`${API}/jobs/${id}`);
    const primaryData = await primary.json().catch(() => null);
    if (primary.ok && primaryData && !primaryData.message) {
      return primaryData;
    }

    const fallback = await fetch(`${API}/jobs/${id}`);
    const fallbackData = await fallback.json().catch(() => null);
    if (fallback.ok && fallbackData && !fallbackData.message) {
      return fallbackData;
    }

    // Last-resort fallback for inconsistent detail routing: resolve from list endpoint.
    const listRes = await fetch(`${API}/jobs`);
    const listData = await listRes.json().catch(() => []);
    if (listRes.ok && Array.isArray(listData)) {
      return listData.find((item) => Number(item.id) === Number(id)) || null;
    }

    return null;
  };

  const renderCompanyReviews = (reviews = []) => {
    if (!companyReviewsEl) return;

    if (!reviews.length) {
      companyReviewsEl.innerHTML = '<p class="p-muted">No public reviews yet.</p>';
      return;
    }

    companyReviewsEl.innerHTML = reviews.map((review) => {
      const stars = "★★★★★".slice(0, review.rating) + "☆☆☆☆☆".slice(0, 5 - review.rating);
      return `
        <article class="review-card">
          <div class="review-header">
            <div>
              <h3>${escapeHtml(review.name)}</h3>
              <p class="meta">${escapeHtml(review.role)}</p>
            </div>
            <span class="review-stars">${stars}</span>
          </div>
          <p class="review-message">${escapeHtml(review.message)}</p>
        </article>
      `;
    }).join("");
  };

  const loadCompanyReviews = async (companyId) => {
    if (!companyId || !companyReviewsEl) return;
    try {
      const res = await fetch(`${API}/reviews/company/${companyId}?limit=6`);
      const data = await res.json().catch(() => []);
      renderCompanyReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      renderCompanyReviews([]);
    }
  };

  const bindCompanyReviewForm = (job) => {
    if (!companyReviewForm || !job?.company_id) return;

    companyReviewForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = (document.getElementById("jobReviewName")?.value || "").trim();
      const role = (document.getElementById("jobReviewRole")?.value || "").trim();
      const rating = Number(document.getElementById("jobReviewRating")?.value || 0);
      const message = (document.getElementById("jobReviewMessage")?.value || "").trim();

      if (!name || !role || !rating || !message) {
        alert("Please complete all review fields.");
        return;
      }

      try {
        const res = await fetch(`${API}/reviews/company/${job.company_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            role,
            rating,
            message,
            employer_user_id: job.posted_by || null,
            job_id: job.id || null
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.message || "Failed to submit review.");
          return;
        }

        companyReviewForm.reset();
        alert("Thanks! Your review is pending approval.");
      } catch (err) {
        console.error(err);
        alert("Network error while submitting review.");
      }
    });
  };

  try {
    const job = await fetchJobById(jobId);

    if (!job) {
      if (titleEl) titleEl.textContent = "Job not found";
      return;
    }

    sessionStorage.setItem("lastJobId", String(job.id));

    setText(titleEl, job.title || "Role");
    if (applyBtn) applyBtn.href = `apply.html?jobId=${job.id}`;

    const metaItems = [job.location, job.job_type || job.jobType]
      .filter(Boolean)
      .map(item => `<span class="meta-item">${item}</span>`)
      .join("");
    if (metaEl) metaEl.innerHTML = metaItems;

    if (companyAvatarEl) {
      if (job.company_logo) {
        companyAvatarEl.outerHTML = `<img id="jobDetailCompanyAvatar" class="job-company-avatar" src="${job.company_logo}" alt="${job.company_name || "Company"}" />`;
      } else {
        companyAvatarEl.textContent = getCompanyInitials(job.company_name || "Company");
      }
    }

    if (companyEl && job.company_name && job.company_id) {
      companyEl.innerHTML = `
        ${job.company_logo ? `<img class="company-logo-img" src="${job.company_logo}" alt="${job.company_name}" />` : ""}
        <a class="company-link" href="company.html?companyId=${job.company_id}">${job.company_name}</a>
      `;
    } else if (companyEl) {
      companyEl.innerHTML = `<span class="company-link">${job.company_name || "Stealth Company"}</span>`;
    }

    if (badgeEl) {
      const matchScore = getMatchScore(job);
      badgeEl.innerHTML = `
        ${job.is_premium ? '<span class="badge badge-premium">Premium</span>' : ""}
        ${job.is_shift ? '<span class="badge badge-shift">Shift</span>' : ""}
        ${job.company_name ? '<span class="badge badge-verified">Verified</span>' : ""}
        <span class="match-pill">${matchScore}% Match</span>
      `;
    }

    if (infoListEl) {
      infoListEl.innerHTML = `
        <span><i class="fa-solid fa-location-dot"></i> ${job.location || "Location not specified"}</span>
        <span><i class="fa-solid fa-briefcase"></i> ${getJobTypeLabel(job)}</span>
        <span><i class="fa-solid fa-sack-dollar"></i> ${getSalaryLabel(job)}</span>
      `;
    }

    if (tagsEl) {
      const tags = getTagList(job);
      tagsEl.innerHTML = tags.map(tag => `<span class="job-tag">${tag}</span>`).join("");
    }

    setText(descEl, job.description || "");

    // Check if user has already applied for this job
    if (applyBtn) {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const checkRes = await authFetch(`${API}/jobs/${jobId}/check-application`);
          const checkData = await checkRes.json();
          if (checkRes.ok && checkData.hasApplied) {
            applyBtn.textContent = "Already Applied";
            applyBtn.classList.add("btn-disabled");
            applyBtn.style.pointerEvents = "none";
            applyBtn.href = "#";
          }
        } catch (err) {
          console.error("Failed to check application status:", err);
        }
      }
    }

    if (highlightsEl) {
      const highlights = [
        job.category ? `Category: ${job.category}` : null,
        job.shift_pay_cents ? `Shift pay: $${(job.shift_pay_cents / 100).toFixed(2)}` : null,
        job.is_premium ? "Premium placement" : null,
        job.company_name ? "Verified company" : null
      ].filter(Boolean);

      highlightsEl.innerHTML = highlights.length
        ? highlights.map(item => `<li>${item}</li>`).join("")
        : "<li>Fast response hiring process</li>";
    }

    if (similarEl) {
      try {
        const allRes = await fetch(`${API}/jobs`);
        const jobs = allRes.ok ? await allRes.json() : [];
        const similar = (Array.isArray(jobs) ? jobs : [])
          .filter(item => item.id !== job.id)
          .filter(item => item.category === job.category || item.location === job.location)
          .slice(0, 4);

      if (!similar.length) {
        similarEl.innerHTML = "<p class=\"p-muted\">No similar jobs yet.</p>";
      } else {
        similarEl.innerHTML = similar
          .map(item => `
            <a class="mini-card" href="job.html?jobId=${item.id}">
              <div>
                <strong>${item.title}</strong>
                <p class="p-muted"><i class="fa-solid fa-location-dot"></i> ${item.location || "Location not specified"}</p>
              </div>
              <span class="mini-arrow">→</span>
            </a>
          `)
          .join("");
      }
      } catch {
        similarEl.innerHTML = "<p class=\"p-muted\">No similar jobs yet.</p>";
      }
    }

    await loadCompanyReviews(Number(job.company_id));
    bindCompanyReviewForm(job);

    if (saveBtn || saveTopBtn) {
      const token = localStorage.getItem("token");
      const syncSaveButtons = (saved) => {
        if (saveBtn) saveBtn.textContent = saved ? "Saved" : "Save job";
        if (saveTopBtn) {
          saveTopBtn.innerHTML = saved
            ? '<i class="fa-solid fa-bookmark"></i> Saved'
            : '<i class="fa-regular fa-bookmark"></i> Save';
        }
      };

      syncSaveButtons(!!job.is_saved);

      const handleSave = async () => {
        if (!token) {
          alert("Login required");
          return;
        }
        const saved = saveBtn ? saveBtn.textContent === "Saved" : /Saved/i.test(saveTopBtn?.textContent || "");
        const method = saved ? "DELETE" : "POST";
        try {
          const resp = await authFetch(`${API}/saved-jobs/${job.id}`, { method });
          const data = await resp.json();
          if (!resp.ok) {
            alert(data.message || "Failed to update saved job");
            return;
          }
          syncSaveButtons(!saved);
        } catch (err) {
          console.error(err);
          alert("Failed to update saved job");
        }
      };

      saveBtn?.addEventListener("click", handleSave);
      saveTopBtn?.addEventListener("click", handleSave);
    }

    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        const pageUrl = window.location.href;
        const title = job.title || "Job Detail";
        try {
          if (navigator.share) {
            await navigator.share({ title, url: pageUrl });
            return;
          }
          await navigator.clipboard.writeText(pageUrl);
          alert("Job link copied to clipboard");
        } catch (err) {
          console.error(err);
          prompt("Copy this link:", pageUrl);
        }
      });
    }

    // ── Report this listing ──────────────────────────────────────
    const reportBtn    = document.getElementById("jobDetailReport");
    const reportPanel  = document.getElementById("reportPanel");
    const reportCancel = document.getElementById("reportCancel");
    const reportSubmit = document.getElementById("reportSubmit");

    reportBtn?.addEventListener("click", () => {
      if (!localStorage.getItem("token")) {
        alert("Please log in to report a listing.");
        return;
      }
      reportPanel.style.display = reportPanel.style.display === "none" ? "block" : "none";
    });

    reportCancel?.addEventListener("click", () => {
      reportPanel.style.display = "none";
    });

    reportSubmit?.addEventListener("click", async () => {
      const reason = document.getElementById("reportReason")?.value;
      const details = document.getElementById("reportDetails")?.value || "";
      if (!reason) {
        alert("Please select a reason.");
        return;
      }
      try {
        const res = await authFetch(`${API}/jobs/${jobId}/report`, {
          method: "POST",
          body: JSON.stringify({ reason, details })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || "Failed to submit report.");
          return;
        }
        alert(data.message || "Report submitted. Thank you.");
        reportPanel.style.display = "none";
      } catch (err) {
        console.error(err);
        alert("Server error — please try again.");
      }
    });
  } catch (err) {
    console.error(err);
    if (titleEl) titleEl.textContent = "Job details unavailable";
  }
});

const getCompanyInitials = (name = "Company") => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "CO";
  const initials = words.slice(0, 2).map(word => word[0]?.toUpperCase() || "").join("");
  return initials || "CO";
};

const getJobTypeLabel = (job) => {
  if (job.is_shift) return "Shift";
  return job.job_type || job.jobType || job.category || "Full-Time";
};

const getSalaryLabel = (job) => {
  const salary = job.salary || job.salary_range || job.pay_range;
  if (salary) return String(salary);
  if (job.shift_pay_cents) return `$${(job.shift_pay_cents / 100).toFixed(2)}`;
  return "Competitive";
};

const getTagList = (job) => {
  const tags = [];
  const location = (job.location || "").toLowerCase();
  const title = (job.title || "").toLowerCase();

  if (location.includes("remote")) tags.push("Remote");
  if (location.includes("hybrid")) tags.push("Hybrid");
  tags.push(getJobTypeLabel(job));
  if (title.includes("senior")) tags.push("Senior");
  if (title.includes("react")) tags.push("React");

  return Array.from(new Set(tags)).slice(0, 4);
};

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
