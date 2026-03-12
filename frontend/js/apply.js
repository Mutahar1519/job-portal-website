let jobId = null;
let canSubmitApplication = true;

document.addEventListener("DOMContentLoaded", () => {
  // Must be logged in to apply
  if (!localStorage.getItem("token")) {
    window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  jobId = params.get("jobId");

  const donationStatus = params.get("donation");
  const donationContext = params.get("context");
  const donationSession = params.get("session_id");

  if (donationStatus && donationContext === "apply") {
    if (donationStatus === "success" && donationSession) {
      authFetch(`${API}/payments/confirm`, {
        method: "POST",
        body: JSON.stringify({ sessionId: donationSession, mode: "donation" })
      }).then(() => {
        alert("Thanks for your support! ✅");
        window.history.replaceState({}, document.title, "apply.html");
      });
    }

    if (donationStatus === "cancel") {
      alert("Donation canceled.");
      window.history.replaceState({}, document.title, "apply.html");
    }
  }

  if (!jobId) {
    const pathMatch = window.location.pathname.match(/\/apply\/(\d+)$/);
    jobId = pathMatch ? pathMatch[1] : null;
  }

  if (!jobId) {
    jobId = sessionStorage.getItem("lastJobId");
  }

  console.log("Full URL:", window.location.href);
  console.log("Search params:", window.location.search);
  console.log("Job ID from URL:", jobId);
  console.log("Job ID type:", typeof jobId);

  // Check if jobId is missing or invalid
  if (!jobId) {
    alert("Invalid job - No job ID provided");
    window.location.href = "jobs.html";
    return;
  }

  // Convert to number and validate
  jobId = parseInt(jobId, 10);
  
  if (isNaN(jobId) || jobId <= 0) {
    alert("Invalid job - Job ID must be a valid number");
    return;
  }

  console.log("Valid job ID:", jobId);

  loadJobSummary(jobId);
});

const loadJobSummary = async (id) => {
  const titleEl = document.getElementById("jobSummaryTitle");
  const metaEl = document.getElementById("jobSummaryMeta");
  const badgeEl = document.getElementById("jobSummaryBadges");
  const companyEl = document.getElementById("jobSummaryCompany");
  const descEl = document.getElementById("jobSummaryDescription");

  if (!titleEl || !metaEl || !badgeEl || !descEl || !companyEl) return;

  try {
    const res = await authFetch(`${API}/jobs/${id}`);
    const job = await res.json();
    if (!res.ok || !job) {
      titleEl.textContent = "This job is not accepting applications";
      if (metaEl) metaEl.innerHTML = "";
      if (badgeEl) badgeEl.innerHTML = "";
      if (companyEl) companyEl.innerHTML = "";
      if (descEl) descEl.textContent = "The role may be pending review, closed, or expired.";
      const submitBtn = document.querySelector('#applyForm button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      canSubmitApplication = false;
      return;
    }

    titleEl.textContent = job.title || "Role";
    const metaItems = [job.location, job.job_type || job.jobType].filter(Boolean);
    metaEl.innerHTML = metaItems.map(item => `<span class="meta-item">${item}</span>`).join("");

    badgeEl.innerHTML = `
      ${job.is_premium ? '<span class="badge badge-premium">Premium</span>' : ""}
      ${job.is_shift ? '<span class="badge badge-shift">Shift</span>' : ""}
    `;

    if (job.company_name && job.company_id) {
      companyEl.innerHTML = `
        ${job.company_logo ? `<img class="company-logo-img" src="${job.company_logo}" alt="${job.company_name}" />` : ""}
        <a class="company-link" href="company.html?companyId=${job.company_id}">${job.company_name}</a>
      `;
    } else {
      companyEl.innerHTML = "";
    }

    descEl.textContent = job.description || "";
  } catch (err) {
    console.error(err);
    titleEl.textContent = "Job details unavailable";
  }
};

const donationModal = document.getElementById("donationModal");
const aiNote = document.getElementById("aiNote");
const coverLetterField = document.getElementById("coverLetter");

const openDonationModal = () => {
  donationModal?.classList.remove("hidden");
};

const closeDonationModal = () => {
  donationModal?.classList.add("hidden");
};

const startDonation = async (amountCents) => {
  if (!amountCents || amountCents <= 0) {
    closeDonationModal();
    return;
  }

  try {
    const res = await authFetch(`${API}/payments/create-donation-session`, {
      method: "POST",
      body: JSON.stringify({ context: "apply", amount_cents: amountCents })
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      alert(data.message || "Donation failed");
      closeDonationModal();
      return;
    }
    window.location.href = data.url;
  } catch (err) {
    console.error(err);
    alert("Donation failed");
    closeDonationModal();
  }
};

donationModal?.addEventListener("click", (event) => {
  if (event.target.id === "donationModal") {
    closeDonationModal();
  }
  const amount = event.target.getAttribute("data-amount");
  if (amount !== null) {
    startDonation(Number(amount));
  }
});

document.querySelector(".ai-actions")?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const template = button.getAttribute("data-template");
  if (!template || !coverLetterField) return;

  const templates = {
    concise: "Hello, I am excited to apply for this role. My background in delivering results quickly and collaborating across teams aligns with your needs. I would love to contribute immediately and bring momentum to your hiring goals.",
    impact: "Hello, I am applying for this role because I consistently drive measurable outcomes. In recent roles, I led initiatives that improved delivery speed, stakeholder satisfaction, and operational clarity. I am eager to bring that same impact to your team.",
    culture: "Hello, I am excited to apply because your mission and team culture resonate with me. I value transparency, ownership, and high-trust collaboration. I would love to contribute with a growth mindset and strong execution.",
  };

  coverLetterField.value = templates[template] || coverLetterField.value;
  if (aiNote) {
    aiNote.textContent = "Draft generated. Personalize it before submitting.";
  }
});

document.getElementById("applyForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Login required to apply");
    window.location.href = "login.html";
    return;
  }

  if (!jobId) {
    alert("Invalid job");
    return;
  }

  if (!canSubmitApplication) {
    alert("This job is no longer open for applications");
    return;
  }

  const coverLetter = document.getElementById("coverLetter").value.trim();
  const fullName = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const country = document.getElementById("country").value.trim();
  const cvFile = document.getElementById("cv").files[0];
  
  if (!coverLetter) {
    alert("Cover letter is required");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("cover_letter", coverLetter);
    formData.append("full_name", fullName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("country", country);
    if (cvFile) {
      formData.append("cv", cvFile);
    }

    const res = await authFetch(`${API}/jobs/${jobId}/apply`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Application failed");
      return;
    }

    alert("Application submitted successfully ✅");
    document.getElementById("applyForm").reset();
    openDonationModal();
  } catch (err) {
    console.error(err);
    alert("Server error");
  }
});
