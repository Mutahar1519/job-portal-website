const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const jobsContainer = document.getElementById("jobsContainer");

let allJobs = [];

fetch(`${API_BASE}/jobs`)
  .then(res => res.json())
  .then(jobs => {
    allJobs = jobs;
    renderJobs(jobs);
  });

function renderJobs(jobs) {
  jobsContainer.innerHTML = "";

  if (!jobs.length) {
    jobsContainer.innerHTML = "<p>No jobs found</p>";
    return;
  }

  jobs.forEach(job => {
    const premiumBadge = job.is_premium
      ? '<span class="badge badge-premium">Premium ⭐</span>'
      : "";
    const premiumClass = job.is_premium ? "premium-job" : "";

    jobsContainer.innerHTML += `
      <div class="job-card ${premiumClass}">
      <h3>${job.title} ${premiumBadge}</h3>
      <p>${job.location} • ${job.jobType}</p>
      <p>${job.description}</p>
      <a href="apply.html?jobId=${job.id}" class="apply-btn" data-job-id="${job.id}">Apply Now</a>
      </div>
    `;
  });
}

function filterJobs() {
  const term = searchInput.value.toLowerCase();
  const category = categoryFilter.value;

  const filtered = allJobs.filter(job =>
    job.title.toLowerCase().includes(term) &&
    (category === "" || job.category === category)
  );

  renderJobs(filtered);
}

searchInput.addEventListener("input", filterJobs);
categoryFilter.addEventListener("change", filterJobs);
