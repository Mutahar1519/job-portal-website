async function loadLatestJobs() {
  try {
    const skeleton = document.getElementById("skeleton");
    if (skeleton) skeleton.style.display = "grid";

    const res = await authFetch(`${API}/jobs`);
    const jobs = await res.json();
    const box = document.getElementById("latestJobs");
    const recommended = document.getElementById("recommendedJobs");
    if (!box) return;
    box.innerHTML = "";
    if (skeleton) skeleton.style.display = "none";

    const allJobs = jobs || [];
    (allJobs).slice(0, 6).forEach(job => {
      box.innerHTML += renderJobCard(job, { includeSaveButton: true, saved: !!job.is_saved });
    });

    const countText = `${allJobs.length}+`;
    const activeCount = document.getElementById("heroActiveCount");
    const postedCount = document.getElementById("jobsPostedCount");
    if (activeCount) activeCount.textContent = countText;
    if (postedCount) postedCount.textContent = countText;

    if (recommended) {
      const picks = getRecommendedJobs(allJobs);
      recommended.innerHTML = picks.length
        ? picks.map(renderJobCard).join("")
        : "<p class=\"empty-state\">No recommendations yet. Search to personalize.</p>";
    }
  } catch (err) {
    console.error("Error loading jobs:", err);
    const skeleton = document.getElementById("skeleton");
    if (skeleton) skeleton.style.display = "none";
  }
}

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

const getRecommendedJobs = (jobs) => {
  const state = getJobSearchState();

  let filtered = [...jobs];
  if (state.category) {
    filtered = filtered.filter(job => job.category === state.category);
  }

  if (state.q) {
    const term = state.q.toLowerCase();
    filtered = filtered.filter(job => (job.title || "").toLowerCase().includes(term));
  }

  if (!filtered.length) {
    filtered = jobs.filter(job => job.is_premium || job.is_shift);
  }

  return filtered.slice(0, 4);
};

const getCompanyInitials = (name = "Company") => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "CO";
  const initials = words.slice(0, 2).map(word => word[0]?.toUpperCase() || "").join("");
  return initials || "CO";
};

const getJobTypeLabel = (job) => {
  if (job.is_shift) return "Shift";
  if (job.category) return job.category;
  return "Full-Time";
};

const getSalaryLabel = (job) => {
  const salary = job.salary || job.salary_range || job.pay_range || "Competitive";
  return String(salary);
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

const renderCompanyAvatar = (job) => {
  if (job.company_logo) {
    return `<img class="job-company-avatar" src="${job.company_logo}" alt="${job.company_name || "Company"}" />`;
  }

  return `<span class="job-company-avatar job-company-avatar-fallback" aria-hidden="true">${getCompanyInitials(job.company_name || "Company")}</span>`;
};

const renderJobCard = (job, options = {}) => {
  const { includeSaveButton = false, saved = false } = options;
  const matchScore = getMatchScore(job);
  const jobDescription = job.description || job.summary || "Explore role details and requirements from this verified employer.";
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
  const companyName = job.company_name || "Stealth Company";
  const companyLink = job.company_id
    ? `<a class="company-link" href="company.html?companyId=${job.company_id}">${companyName}</a>`
    : `<span class="company-link">${companyName}</span>`;
  const tagsMarkup = getTagList(job).map(tag => `<span class="job-tag">${tag}</span>`).join("");
  const imageHtml = job.image_url
    ? `<img class="job-card-image" src="${apiOrigin}${job.image_url}" alt="${job.title}" loading="lazy">`
    : "";
  const hasImageClass = job.image_url ? "has-image" : "";

  return `
    <div class="job-card ${premiumClass} ${hasImageClass}">
      ${imageHtml}
      <div class="job-card-top">
        <div class="job-card-head">
          ${renderCompanyAvatar(job)}
          <div class="job-card-content">
            <h3 class="job-card-title">${job.title}</h3>
            <p class="job-company-line">
              <i class="fa-solid fa-building"></i>
              ${companyLink}
            </p>
          </div>
        </div>
        <div class="job-card-badges">
          ${premiumBadge}
          ${shiftBadge}
          ${verifiedBadge}
          <span class="match-pill">${matchScore}% Match</span>
        </div>
      </div>

      <div class="job-info-list">
        <span><i class="fa-solid fa-location-dot"></i> ${job.location || "Location not specified"}</span>
        <span><i class="fa-solid fa-briefcase"></i> ${getJobTypeLabel(job)}</span>
        <span><i class="fa-solid fa-sack-dollar"></i> ${getSalaryLabel(job)}</span>
      </div>

      <div class="job-tag-row">${tagsMarkup}</div>

          <p class="job-desc job-card-description">${jobDescription}</p>

      <div class="job-card-actions">
        <a href="job.html?jobId=${job.id}" class="btn btn-ghost job-action-btn">Details</a>
        <a href="apply.html?jobId=${job.id}" class="apply-btn job-action-btn" data-job-id="${job.id}"><i class="fa-solid fa-rocket"></i> Apply Now</a>
        ${includeSaveButton ? `<button class="btn btn-outline save-btn" type="button" data-save-id="${job.id}" data-saved="${saved ? 1 : 0}">${saved ? "Saved" : "Save"}</button>` : ""}
      </div>
    </div>
  `;
};

document.getElementById("latestJobs")?.addEventListener("click", async (event) => {
  const button = event.target.closest(".save-btn");
  if (!button) return;

  const jobId = button.getAttribute("data-save-id");
  const saved = button.getAttribute("data-saved") === "1";
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Login required");
    return;
  }

  try {
    const res = await authFetch(`${API}/saved-jobs/${jobId}`, {
      method: saved ? "DELETE" : "POST"
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Failed to update saved job");
      return;
    }
    await loadLatestJobs();
  } catch (err) {
    console.error(err);
    alert("Failed to update saved job");
  }
});

const homeSearchForm = document.getElementById("homeSearchForm");
const homeSearchInput = document.getElementById("homeSearchInput");
const popularChips = Array.from(document.querySelectorAll(".popular-chip"));

homeSearchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = (homeSearchInput?.value || "").trim();
  const existing = getJobSearchState();
  const nextState = {
    ...existing,
    q: query
  };

  try {
    localStorage.setItem("jobSearchState", JSON.stringify(nextState));
  } catch (err) {
    console.error(err);
  }

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  const target = params.toString() ? `jobs.html?${params.toString()}` : "jobs.html";
  window.location.href = target;
});

popularChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const term = (chip.getAttribute("data-term") || "").trim();
    if (!term) return;

    try {
      const existing = getJobSearchState();
      localStorage.setItem("jobSearchState", JSON.stringify({ ...existing, q: term }));
    } catch (err) {
      console.error(err);
    }

    window.location.href = `jobs.html?q=${encodeURIComponent(term)}`;
  });
});

loadLatestJobs();
