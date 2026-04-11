// ================= CONFIG =================
const API = "http://localhost:3000";
const pageToken = localStorage.getItem("token");

const jobsContainer = document.getElementById("jobsContainer");
let selectedJobId = null;

// ================= FETCH JOBS =================
function loadJobs() {
  fetch(`${API}/jobs`)
    .then(res => res.json())
    .then(jobs => {
      const container = document.getElementById("jobsContainer");
      container.innerHTML = "";

      if (!jobs.length) {
        container.innerHTML = "<p>No jobs found</p>";
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
            <p>${job.location}</p>
            <a href="apply.html?jobId=${job.id}" class="apply-btn" data-job-id="${job.id}">Apply Now</a>
          </div>
        `;
      });
    })
    .catch(err => {
      console.error(err);
      document.getElementById("jobsContainer").innerText = "Error loading jobs";
    });
}

loadJobs();

// ================= APPLY MODAL =================
function openApplyModal(jobId) {
  selectedJobId = jobId;
  document.getElementById("applyModal").style.display = "flex";
}

function closeApplyModal() {
  document.getElementById("applyModal").style.display = "none";
  selectedJobId = null;
}

// ================= SUBMIT APPLICATION =================
async function submitApplication() {
  if (!pageToken) {
    showWarning("Login required");
    return;
  }

  if (!selectedJobId) {
    showWarning("No job selected");
    return;
  }

  const coverLetter = document.getElementById("coverLetter").value;

  try {
    const res = await fetch(
      `${API}/api/jobs/${selectedJobId}/apply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pageToken}`
        },
        body: JSON.stringify({ cover_letter: coverLetter })
      }
    );

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    showSuccess("Application submitted ✅");
    closeApplyModal();

  } catch (err) {
    showError(err.message || "Apply failed");
  }
}
