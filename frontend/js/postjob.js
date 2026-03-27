document.addEventListener("DOMContentLoaded", () => {
  const DRAFT_KEY = "jobPostDraft.v1";
  const form = document.getElementById("jobForm");
  if (!form) return;

  const rawUser = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  let currentUser = null;
  try {
    currentUser = rawUser ? JSON.parse(rawUser) : null;
  } catch (err) {
    currentUser = null;
  }

  if (!token || !currentUser) {
    alert("Please login first");
    window.location.href = "login.html";
    return;
  }

  const isEmployer = currentUser.role === "employer";
  const isAdmin = !!currentUser.is_admin || currentUser.role === "admin";
  if (!isEmployer && !isAdmin) {
    alert("Only employers or admins can post jobs");
    window.location.href = "dashboard.html";
    return;
  }

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
  const postPaymentModal = document.getElementById("postPaymentModal");
  let pendingPremiumJob = null;
  let donationContextMode = "post";
  let selectedPaymentMethod = "card";

  const PAYMENT_LABELS = {
    card: "Card",
    applepay: "Apple Pay",
    gpay: "Google Pay",
    paypal: "PayPal",
    bank_transfer: "Bank Transfer"
  };

  const getPaymentButtons = () => Array.from(document.querySelectorAll("#postPaymentOptions .payment-method-option"));

  const setPaymentSelection = (method, { focus = false } = {}) => {
    const selectedText = document.getElementById("postPaymentSelectedText");
    getPaymentButtons().forEach((btn) => {
      const isSelected = btn.dataset.method === method;
      btn.classList.toggle("is-selected", isSelected);
      btn.setAttribute("aria-selected", isSelected ? "true" : "false");
      btn.setAttribute("tabindex", isSelected ? "0" : "-1");
      if (isSelected && focus) btn.focus();
    });
    if (selectedText) selectedText.textContent = `Selected: ${PAYMENT_LABELS[method] || method}`;
    selectedPaymentMethod = method;
  };

  let resolvePaymentChoice = null;
  const openPaymentModal = () => new Promise((resolve) => {
    resolvePaymentChoice = resolve;
    postPaymentModal?.classList.remove("hidden");
    setPaymentSelection(selectedPaymentMethod || "card");
  });
  const closePaymentModal = (method) => {
    postPaymentModal?.classList.add("hidden");
    if (resolvePaymentChoice) {
      resolvePaymentChoice(method || null);
      resolvePaymentChoice = null;
    }
  };

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
        body: JSON.stringify({ context: "post", amount_cents: amountCents, payment_method: selectedPaymentMethod })
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
      body: JSON.stringify({ mode: "create", donation_cents: donationCents, payment_method: selectedPaymentMethod })
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

  document.addEventListener("click", (event) => {
    const option = event.target.closest("#postPaymentOptions .payment-method-option");
    if (option) {
      setPaymentSelection(option.dataset.method, { focus: true });
      return;
    }

    if (event.target.closest("#postPaymentConfirm")) {
      closePaymentModal(selectedPaymentMethod || "card");
      return;
    }

    if (event.target.closest("#postPaymentCancel")) {
      closePaymentModal(null);
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
      const paymentMethod = await openPaymentModal();
      if (!paymentMethod) return;
      pendingPremiumJob = jobData;
      openDonationModal("premium");
      return;
    }

    try {
      console.log("Submitting job data:", jobData);
      const imageFile = document.getElementById("jobImage")?.files?.[0] ?? null;
      let res;
      if (imageFile) {
        const token = localStorage.getItem("token");
        const fd = new FormData();
        Object.entries({ ...jobData, is_premium: false }).forEach(([k, v]) => {
          if (v != null) fd.append(k, String(v));
        });
        fd.append("job_image", imageFile);
        res = await fetch(`${API}/jobs`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
      } else {
        const imageUrlInput = (document.getElementById("jobImageUrl")?.value || "").trim();
        res = await authFetch(`${API}/jobs`, {
          method: "POST",
          body: JSON.stringify({
            ...jobData,
            is_premium: false,
            ...(imageUrlInput ? { image_url: imageUrlInput } : {})
          })
        });
      }

      console.log("API Response status:", res.status);
      const data = await res.json();
      console.log("API Response data:", data);

      if (!res.ok) {
        if (res.status === 403 && data.message && data.message.toLowerCase().includes("verification")) {
          // Show persistent verification banner instead of alert
          let banner = document.getElementById("verificationBanner");
          if (!banner) {
            banner = document.createElement("div");
            banner.id = "verificationBanner";
            banner.style.cssText = "background:#fef9c3;border:1px solid #fde047;color:#713f12;padding:16px 20px;border-radius:10px;margin-bottom:20px;font-size:0.95rem;line-height:1.6;";
            form.parentNode.insertBefore(banner, form);
          }
          banner.innerHTML = `<strong>⚠️ Account not yet verified</strong><br>${data.message}`;
          banner.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          alert(data.message || "Failed to post job");
        }
        console.error("Job submission error:", data);
        return;
      }

      alert("Job posted successfully ✅");
      form.reset();
      localStorage.removeItem(DRAFT_KEY);
      if (shiftFields) shiftFields.style.display = "none";
      const paymentMethod = await openPaymentModal();
      if (!paymentMethod) return;
      openDonationModal("post");
    } catch (err) {
      console.error("Job submission error:", err);
      alert("Error posting job: " + err.message);
    }
  });
});
