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
  if (job.shift_pay_cents) return `$${Math.round(job.shift_pay_cents / 100)}`;
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

const renderCompanyAvatar = (job) => {
  if (job.company_logo) {
    return `<img class="job-company-avatar" src="${job.company_logo}" alt="${job.company_name || "Company"}" />`;
  }

  return `<span class="job-company-avatar job-company-avatar-fallback" aria-hidden="true">${getCompanyInitials(job.company_name || "Company")}</span>`;
};

const renderJobCard = (job, options = {}) => {
  const { includeSaveButton = true, saved = false } = options;
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
  const companyName = job.company_name || "Stealth Company";
  const companyLink = job.company_id
    ? `<a class="company-link" href="company.html?companyId=${job.company_id}">${companyName}</a>`
    : `<span class="company-link">${companyName}</span>`;
  const tagsMarkup = getTagList(job).map(tag => `<span class="job-tag">${tag}</span>`).join("");
  const description = job.description || job.summary || "Explore role details and requirements from this verified employer.";
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

      <p class="job-desc job-card-description">${description}</p>

      <div class="job-card-actions">
        <a href="job.html?jobId=${job.id}" class="btn btn-ghost job-action-btn">Details</a>
        <a href="apply.html?jobId=${job.id}" class="apply-btn job-action-btn" data-job-id="${job.id}"><i class="fa-solid fa-rocket"></i> Apply Now</a>
        ${includeSaveButton ? `<button class="btn btn-outline save-btn" type="button" data-save-id="${job.id}" data-saved="${saved ? 1 : 0}">${saved ? "Saved" : "Save"}</button>` : ""}
      </div>
    </div>
  `;
};

async function loadJobs() {
  const q = document.getElementById("searchInput").value;
  const category = document.getElementById("categoryFilter").value;
  const location = document.getElementById("locationFilter")?.value || "";
  const jobType = document.getElementById("typeFilter")?.value || "";
  const experience = document.getElementById("experienceFilter")?.value || "";
  const salary = document.getElementById("salaryFilter")?.value || "";
  const remoteOnly = document.getElementById("remoteOnly")?.checked || false;
  const skeleton = document.getElementById("jobsSkeleton");
  const resultsCount = document.getElementById("jobsResultCount");
  const resultsHint = document.getElementById("jobsResultHint");

  try {
    if (skeleton) {
      skeleton.innerHTML = Array.from({ length: 6 })
        .map(() => "<div class=\"skeleton-card\"></div>")
        .join("");
      skeleton.classList.remove("hidden");
    }

    const res = await authFetch(`${API}/jobs`);
    const jobs = await res.json();
    const container = document.getElementById("jobs");
    container.innerHTML = "";
    if (skeleton) skeleton.classList.add("hidden");

    // Filter jobs client-side
    const filtered = (jobs || []).filter(job => {
      const titleMatch = !q || job.title.toLowerCase().includes(q.toLowerCase());
      const categoryMatch = !category || job.category === category;
      const locationValue = (job.location || "").toLowerCase();
      const locationMatch = !location || locationValue.includes(location.toLowerCase());
      const jobTypeValue = (job.job_type || job.jobType || "").toLowerCase();
      const typeMatch = !jobType || jobTypeValue.includes(jobType.toLowerCase());
      const experienceMatch = !experience || (job.description || "").toLowerCase().includes(experience);
      const remoteMatch = !remoteOnly || locationValue.includes("remote") || locationValue.includes("hybrid");
      const salaryMatch = !salary || matchSalary(job, salary);

      return titleMatch && categoryMatch && locationMatch && typeMatch && experienceMatch && remoteMatch && salaryMatch;
    });

    if (!filtered.length) {
      if (resultsCount) resultsCount.textContent = "0";
      if (resultsHint) resultsHint.textContent = "No roles match your current filters. Try broadening your search.";
      container.innerHTML = "<p class=\"empty-state\">No jobs found. Try adjusting your filters.</p>";
      return;
    }

    if (resultsCount) resultsCount.textContent = String(filtered.length);
    if (resultsHint) {
      const filterLabels = [
        q ? `keyword: ${q}` : "",
        category ? `category: ${category}` : "",
        location ? `location: ${location}` : "",
        remoteOnly ? "remote only" : ""
      ].filter(Boolean);

      resultsHint.textContent = filterLabels.length
        ? `Showing matches for ${filterLabels.join(" | ")}.`
        : "Showing all available roles from verified employers.";
    }

    filtered.forEach(job => {
      container.innerHTML += renderJobCard(job, { includeSaveButton: true, saved: !!job.is_saved });
    });

    saveSearchState({ q, category, location, jobType, experience, salary, remoteOnly });
    renderRecentSearches();
  } catch (err) {
    console.error("Error loading jobs:", err);
    document.getElementById("jobs").innerHTML = "<p>Error loading jobs</p>";
    const resultsCount = document.getElementById("jobsResultCount");
    const resultsHint = document.getElementById("jobsResultHint");
    if (resultsCount) resultsCount.textContent = "0";
    if (resultsHint) resultsHint.textContent = "Unable to load roles right now. Please try again.";
    if (skeleton) skeleton.classList.add("hidden");
  }
}

const parseJobSearchState = () => {
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
  const state = parseJobSearchState();

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

const matchSalary = (job, filter) => {
  if (filter === "shift") {
    return !!job.shift_pay_cents;
  }

  const salaryValue = extractSalaryValue(job);
  if (!salaryValue) return false;

  if (filter === "0-50000") return salaryValue <= 50000;
  if (filter === "50000-100000") return salaryValue > 50000 && salaryValue <= 100000;
  if (filter === "100000+") return salaryValue > 100000;
  return true;
};

const extractSalaryValue = (job) => {
  if (job.salary) {
    const value = Number(String(job.salary).replace(/[^0-9]/g, ""));
    return Number.isFinite(value) ? value : null;
  }

  if (job.shift_pay_cents) {
    return Math.round(job.shift_pay_cents / 100);
  }

  const description = (job.description || "").toLowerCase();
  const match = description.match(/\$\s?(\d{2,3})k/);
  if (match) {
    return Number(match[1]) * 1000;
  }

  return null;
};

const saveSearchState = (state) => {
  try {
    localStorage.setItem("jobSearchState", JSON.stringify(state));
  } catch (err) {
    console.error(err);
  }
};

const renderRecentSearches = () => {
  const container = document.getElementById("recentSearches");
  if (!container) return;

  const state = getSearchState();
  const chips = [];

  if (state.q) chips.push(state.q);
  if (state.category) chips.push(state.category);
  if (state.location) chips.push(state.location);
  if (state.remoteOnly) chips.push("Remote");

  if (!chips.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = chips
    .map((chip) => `<span class="search-chip">${chip}</span>`)
    .join("");
};

const getSearchState = () => {
  return parseJobSearchState();
};

document.getElementById("jobs")?.addEventListener("click", async (event) => {
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
    await loadJobs();
  } catch (err) {
    console.error(err);
    alert("Failed to update saved job");
  }
});

const toggleButton = document.getElementById("toggleFilters");
const clearButton = document.getElementById("clearFilters");
const advancedFilters = document.getElementById("advancedFilters");

toggleButton?.addEventListener("click", () => {
  advancedFilters?.classList.toggle("hidden");
  toggleButton.textContent = advancedFilters?.classList.contains("hidden")
    ? "More filters"
    : "Hide filters";
});

clearButton?.addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("categoryFilter").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("typeFilter").value = "";
  document.getElementById("experienceFilter").value = "";
  document.getElementById("salaryFilter").value = "";
  document.getElementById("remoteOnly").checked = false;
  loadJobs();
});

const seedSearchState = () => {
  const state = getSearchState();
  const query = new URLSearchParams(window.location.search).get("q");

  if (query && !state.q) {
    state.q = query;
    saveSearchState(state);
  }

  document.getElementById("searchInput").value = state.q || "";
  document.getElementById("categoryFilter").value = state.category || "";
  document.getElementById("locationFilter").value = state.location || "";
  document.getElementById("typeFilter").value = state.jobType || "";
  document.getElementById("experienceFilter").value = state.experience || "";
  document.getElementById("salaryFilter").value = state.salary || "";
  document.getElementById("remoteOnly").checked = !!state.remoteOnly;
  renderRecentSearches();
};

seedSearchState();
loadJobs();
