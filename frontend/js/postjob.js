document.addEventListener("DOMContentLoaded", () => {
  const DRAFT_KEY = "jobPostDraft.v1";
  const form = document.getElementById("jobForm");
  if (!form) return;

  const titleInput = document.getElementById("jobTitle");
  const descInput = document.getElementById("jobDescription");
  const locationInput = document.getElementById("location");
  const typeInput = document.getElementById("jobType");
  const categoryInput = document.getElementById("jobCategory");
  const salaryInput = document.getElementById("salary");
  const deadlineInput = document.getElementById("applicationDeadline");
  const premiumInput = document.getElementById("isPremium");
  const shiftInput = document.getElementById("isShift");
  const shiftFields = document.getElementById("shiftFields");
  const shiftStartInput = document.getElementById("shiftStart");
  const shiftEndInput = document.getElementById("shiftEnd");
  const shiftPayInput = document.getElementById("shiftPay");

  const readDraft = () => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error("Invalid JSON in localStorage.jobPostDraft.v1", err);
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
  };

  const getDraftPayload = () => ({
    title: titleInput?.value || "",
    description: descInput?.value || "",
    location: locationInput?.value || "",
    job_type: typeInput?.value || "",
    category: categoryInput?.value || "",
    salary: salaryInput?.value || "",
    application_deadline: deadlineInput?.value || "",
    is_shift: !!shiftInput?.checked,
    shift_start: shiftStartInput?.value || "",
    shift_end: shiftEndInput?.value || "",
    shift_pay: shiftPayInput?.value || "",
    updated_at: new Date().toISOString()
  });

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(getDraftPayload()));
    } catch (err) {
      console.error(err);
    }
  };

  const restoreDraft = () => {
    const draft = readDraft();
    if (!draft) return;

    if (titleInput && !titleInput.value) titleInput.value = draft.title || "";
    if (descInput && !descInput.value) descInput.value = draft.description || "";
    if (locationInput && !locationInput.value) locationInput.value = draft.location || "";
    if (typeInput && !typeInput.value) typeInput.value = draft.job_type || "";
    if (categoryInput && !categoryInput.value) categoryInput.value = draft.category || "";
    if (salaryInput && !salaryInput.value) salaryInput.value = draft.salary || "";
    if (deadlineInput && !deadlineInput.value) deadlineInput.value = draft.application_deadline || "";

    if (shiftInput) shiftInput.checked = !!draft.is_shift;
    if (shiftFields) shiftFields.style.display = shiftInput?.checked ? "block" : "none";
    if (shiftStartInput && !shiftStartInput.value) shiftStartInput.value = draft.shift_start || "";
    if (shiftEndInput && !shiftEndInput.value) shiftEndInput.value = draft.shift_end || "";
    if (shiftPayInput && !shiftPayInput.value) shiftPayInput.value = draft.shift_pay || "";
  };

  restoreDraft();

  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get("payment");
  const sessionId = params.get("session_id");
  const mode = params.get("mode");
  const donationStatus = params.get("donation");
  const donationContext = params.get("context");

  if (donationStatus && donationContext === "post") {
    if (donationStatus === "success" && sessionId) {
      authFetch(`${API}/payments/confirm`, {
        method: "POST",
        body: JSON.stringify({ sessionId, mode: "donation" })
      }).then(() => {
        alert("Thanks for your support! ✅");
        window.history.replaceState({}, document.title, "post-jobs.html");
      });
    }

    if (donationStatus === "cancel") {
      alert("Donation canceled.");
      window.history.replaceState({}, document.title, "post-jobs.html");
    }
  }

  if (paymentStatus === "success" && mode === "create" && sessionId) {
    const stored = sessionStorage.getItem("pendingPremiumJob");
    if (stored) {
      let jobData = null;
      if (typeof safeParseJson === "function") {
        jobData = safeParseJson(stored, "sessionStorage.pendingPremiumJob");
      } else {
        try {
          jobData = JSON.parse(stored);
        } catch (err) {
          console.error("Invalid JSON in sessionStorage.pendingPremiumJob", err);
        }
      }

      if (!jobData) {
        sessionStorage.removeItem("pendingPremiumJob");
        alert("Saved job data is invalid. Please create the job again.");
        window.history.replaceState({}, document.title, "post-jobs.html");
        return;
      }
      authFetch(`${API}/payments/confirm`, {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          mode: "create",
          jobData
        })
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || "Payment confirmation failed");
          return;
        }
        sessionStorage.removeItem("pendingPremiumJob");
        localStorage.removeItem(DRAFT_KEY);
        alert("Premium job created successfully ✅");
        window.history.replaceState({}, document.title, "post-jobs.html");
      });
    }
  }

  const donationModal = document.getElementById("donationModal");
  let pendingPremiumJob = null;
  let donationContextMode = "post";

  const openDonationModal = (context) => {
    donationContextMode = context;
    donationModal?.classList.remove("hidden");
  };

  const closeDonationModal = () => {
    donationModal?.classList.add("hidden");
  };

  const startDonation = async (amountCents) => {
    if (!amountCents || amountCents <= 0) {
      closeDonationModal();
      if (donationContextMode === "premium" && pendingPremiumJob) {
        await startPremiumCheckout(0);
      }
      return;
    }

    if (donationContextMode === "premium" && pendingPremiumJob) {
      await startPremiumCheckout(amountCents);
      return;
    }

    try {
      const res = await authFetch(`${API}/payments/create-donation-session`, {
        method: "POST",
        body: JSON.stringify({ context: "post", amount_cents: amountCents })
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

  const startPremiumCheckout = async (donationCents) => {
    sessionStorage.setItem("pendingPremiumJob", JSON.stringify(pendingPremiumJob));

    const res = await authFetch(`${API}/payments/create-checkout-session`, {
      method: "POST",
      body: JSON.stringify({ mode: "create", donation_cents: donationCents })
    });

    const data = await res.json();
    if (!res.ok || !data.url) {
      alert(data.message || "Failed to start payment");
      closeDonationModal();
      return;
    }

    window.location.href = data.url;
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

  shiftInput?.addEventListener("change", () => {
    if (!shiftFields) return;
    shiftFields.style.display = shiftInput.checked ? "block" : "none";
    saveDraft();
  });

  [
    titleInput,
    descInput,
    locationInput,
    typeInput,
    categoryInput,
    salaryInput,
    deadlineInput,
    shiftStartInput,
    shiftEndInput,
    shiftPayInput
  ].forEach((field) => {
    field?.addEventListener("input", saveDraft);
    field?.addEventListener("change", saveDraft);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const jobData = {
      title: titleInput.value.trim(),
      description: descInput.value.trim(),
      location: locationInput.value.trim(),
      job_type: typeInput ? typeInput.value.trim() : "Full-time",
      category: categoryInput ? categoryInput.value.trim() : "General",
      salary: salaryInput ? salaryInput.value.trim() : "",
      application_deadline: deadlineInput ? deadlineInput.value : ""
    };

    if (shiftInput && shiftInput.checked) {
      const shiftStart = shiftStartInput?.value || "";
      const shiftEnd = shiftEndInput?.value || "";
      const shiftPay = Number(shiftPayInput?.value || 0);

      if (!shiftStart || !shiftEnd || !shiftPay) {
        alert("Shift start, end, and pay are required");
        return;
      }

      jobData.is_shift = true;
      jobData.shift_start = shiftStart;
      jobData.shift_end = shiftEnd;
      jobData.shift_pay_cents = Math.round(shiftPay * 100);
    }

    if (!jobData.title || !jobData.description || !jobData.location) {
      alert("Please fill out all required fields");
      return;
    }

    if (premiumInput && premiumInput.checked) {
      pendingPremiumJob = jobData;
      openDonationModal("premium");
      return;
    }

    const res = await authFetch(`${API}/jobs`, {
      method: "POST",
      body: JSON.stringify({
        ...jobData,
        is_premium: false
      })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Failed to post job");
      return;
    }

    alert("Job posted successfully ✅");
    form.reset();
    localStorage.removeItem(DRAFT_KEY);
    if (shiftFields) shiftFields.style.display = "none";
    openDonationModal("post");
  });
});
