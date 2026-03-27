document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Login required");
    window.location.href = "login.html";
    return;
  }

  // Show "Post a job" hero button only for employers/admins
  // Also update hero text to match the user's role
  try {
    const dashUser = JSON.parse(localStorage.getItem("user") || "{}");
    const dashPostBtn = document.getElementById("dashboardPostJobBtn");
    const dashCompanyBtn = document.getElementById("dashboardCompanyBtn");
    if (dashPostBtn && (dashUser.role === "employer" || dashUser.is_admin)) {
      dashPostBtn.style.display = "inline-flex";
    }
    if (dashCompanyBtn && (dashUser.role === "employer" || dashUser.is_admin)) {
      dashCompanyBtn.style.display = "inline-flex";
    }
    if (dashUser.role === "employer" || dashUser.is_admin) {
      const eyebrow = document.getElementById("dashboardEyebrow");
      const title = document.getElementById("dashboardTitle");
      const subtitle = document.getElementById("dashboardSubtitle");
      if (eyebrow) eyebrow.textContent = dashUser.is_admin ? "Admin dashboard" : "Employer dashboard";
      if (title) title.textContent = "Manage your job postings, applications, and shift alerts";
      if (subtitle) subtitle.textContent = "Post jobs, review candidates, and track your recruitment pipeline in one place.";
    }
  } catch (e) { /* ignore */ }

  const container = document.getElementById("applications");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const sortBy = document.getElementById("sortBy");
  const savedContainer = document.getElementById("savedJobs");
  const alertsList = document.getElementById("alertsList");
  const alertForm = document.getElementById("alertForm");
  const shiftAlertsList = document.getElementById("shiftAlerts");
  const shiftAlertCount = document.getElementById("shiftAlertCount");
  const refreshShiftAlerts = document.getElementById("refreshShiftAlerts");
  const createShiftAlertBtn = document.getElementById("createShiftAlertBtn");
  const shiftAlertBuilder = document.getElementById("shiftAlertBuilder");
  const shiftAlertForm = document.getElementById("shiftAlertForm");
  const cancelShiftAlertBtn = document.getElementById("cancelShiftAlertBtn");
  const shiftAlertRules = document.getElementById("shiftAlertRules");
  let editingShiftAlertId = null;

  if (!container) return;

  let allApps = [];
  let alerts = [];

  const jobAlertsList = document.getElementById("jobAlerts");
  const jobAlertCount = document.getElementById("jobAlertCount");
  const refreshJobAlerts = document.getElementById("refreshJobAlerts");

  const statusOrder = ["pending", "reviewed", "accepted", "rejected"];

  const pipelineLabel = (stage) => {
    const value = (stage || "new").toString().toLowerCase();
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const formatDeadlineMeta = (app) => {
    if (!app.application_deadline) {
      return '<span class="meta">Deadline: Open</span>';
    }

    const deadlineDate = new Date(app.application_deadline);
    if (Number.isNaN(deadlineDate.valueOf())) {
      return '<span class="meta">Deadline: Not available</span>';
    }

    const isOpen = Number(app.is_open_for_applications) === 1;
    const formatted = deadlineDate.toLocaleString();

    if (!isOpen) {
      return `<span class="meta">Deadline passed: ${formatted}</span>`;
    }

    return `<span class="meta">Apply by: ${formatted}</span>`;
  };

  const normalizeStatus = (value) => {
    return (value || "").toLowerCase();
  };

  const setStats = (apps) => {
    const statTotal = document.getElementById("statTotal");
    const statPending = document.getElementById("statPending");
    const statReviewed = document.getElementById("statReviewed");
    const statAccepted = document.getElementById("statAccepted");

    const counts = apps.reduce(
      (acc, app) => {
        const status = normalizeStatus(app.status);
        acc.total += 1;
        if (status === "pending") acc.pending += 1;
        if (status === "reviewed") acc.reviewed += 1;
        if (status === "accepted") acc.accepted += 1;
        return acc;
      },
      { total: 0, pending: 0, reviewed: 0, accepted: 0 }
    );

    if (statTotal) statTotal.textContent = counts.total;
    if (statPending) statPending.textContent = counts.pending;
    if (statReviewed) statReviewed.textContent = counts.reviewed;
    if (statAccepted) statAccepted.textContent = counts.accepted;
  };

  const renderApplications = (apps) => {
    if (!apps.length) {
      container.innerHTML = "<p class=\"empty-state\">No applications match your filters.</p>";
      return;
    }

    container.innerHTML = "";
    const formatShiftMeta = (app) => {
      if (!app.is_shift) return "";
      const pay = app.shift_pay_cents ? `$${(app.shift_pay_cents / 100).toFixed(2)}` : "";
      const start = app.shift_start ? new Date(app.shift_start).toLocaleString() : "";
      const end = app.shift_end ? new Date(app.shift_end).toLocaleString() : "";
      const time = start && end ? `${start} - ${end}` : start || end;
      const parts = [pay, time].filter(Boolean).join(" • ");
      return parts ? `<div class="p-muted">${parts}</div>` : "";
    };

    const renderShiftActions = (app) => {
      if (!app.is_shift || !app.escrow_id) return "";
      if (app.escrow_status !== "awaiting_confirmation") return "";
      if (app.worker_confirmed) {
        return "<div class=\"p-muted\">You confirmed completion.</div>";
      }
      return `
        <button class="btn btn-outline" type="button" data-action="worker-confirm" data-job-id="${app.job_id}">
          Confirm shift completion
        </button>
      `;
    };

    const renderShiftBadge = (app) => {
      if (!app.is_shift) return "";
      const status = (app.escrow_status || app.shift_status || "open").toLowerCase();
      const label = status.replace(/_/g, " ");
      return `<span class="status-pill status-${status}">${label}</span>`;
    };

    apps.forEach(app => {
      const created = app.created_at ? new Date(app.created_at).toLocaleDateString() : "";
      const status = normalizeStatus(app.status);
      const statusIndex = Math.max(0, statusOrder.indexOf(status));
      const stage = (app.pipeline_stage || "new").toLowerCase();

      const cvLink = app.cv_path
        ? `<a href="${app.cv_path}" target="_blank" class="btn btn-outline">View CV</a>`
        : "";

      container.innerHTML += `
        <article class="app-card">
          <div class="app-card__header">
            <div>
              <h3>${esc(app.title)}</h3>
              <p class="meta">${esc(app.location || "")} ${app.job_type ? "• " + esc(app.job_type) : ""}</p>
              <p class="meta">Pipeline stage: ${esc(pipelineLabel(stage))}</p>
            </div>
            <div class="status-stack">
              <span class="status-pill status-${status}">${esc(app.status)}</span>
              ${renderShiftBadge(app)}
            </div>
          </div>
          <div class="app-timeline">
            ${statusOrder
              .map((step, index) => {
                const stepLabel = step.charAt(0).toUpperCase() + step.slice(1);
                const activeClass = index <= statusIndex ? "active" : "";
                return `<span class="timeline-dot ${activeClass}">${stepLabel}</span>`;
              })
              .join("")}
          </div>
          ${app.is_shift ? `<div class="shift-meta">${formatShiftMeta(app)}</div>` : ""}
          <div class="app-card__footer">
            <span class="meta">Applied: ${created}</span>
            ${formatDeadlineMeta(app)}
            <div class="actions">
              ${renderShiftActions(app)}
              ${cvLink}
            </div>
          </div>
        </article>
      `;
    });
  };

  const applyFilters = () => {
    const term = (searchInput?.value || "").trim().toLowerCase();
    const status = statusFilter?.value || "all";
    const sort = sortBy?.value || "recent";

    let filtered = [...allApps];

    if (term) {
      filtered = filtered.filter(app => {
        const title = (app.title || "").toLowerCase();
        const location = (app.location || "").toLowerCase();
        return title.includes(term) || location.includes(term);
      });
    }

    if (status !== "all") {
      filtered = filtered.filter(app => normalizeStatus(app.status) === status);
    }

    if (sort === "recent") {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    if (sort === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    if (sort === "title") {
      filtered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    renderApplications(filtered);
  };

  const renderSavedJobs = (jobs) => {
    if (!savedContainer) return;

    if (!jobs.length) {
      savedContainer.innerHTML = "<p class=\"empty-state\">No saved jobs yet.</p>";
      return;
    }

    savedContainer.innerHTML = "";
    jobs.forEach(job => {
      const premiumBadge = job.is_premium
        ? '<span class="badge badge-premium">Premium</span>'
        : "";

      const company = job.company_name ? ` \u2022 ${esc(job.company_name)}` : "";
      const jobType = job.job_type || job.jobType || "";

      savedContainer.innerHTML += `
        <article class="job-card">
          <h3>${esc(job.title)} ${premiumBadge}</h3>
          <p class="meta">${esc(job.location || "")}${jobType ? " \u2022 " + esc(jobType) : ""}${company}</p>
          <div class="job-card-actions">
            <a href="apply.html?jobId=${job.id}" class="apply-btn" data-job-id="${job.id}">Apply</a>
            <button class="btn btn-outline save-btn" type="button" data-save-id="${job.id}" data-saved="1">Remove</button>
          </div>
        </article>
      `;
    });
  };

  const loadSavedJobs = async () => {
    if (!savedContainer) return;
    try {
      const res = await authFetch(`${API}/saved-jobs`);
      const jobs = await res.json();
      if (!res.ok) {
        savedContainer.innerHTML = "<p class=\"empty-state\">Failed to load saved jobs.</p>";
        return;
      }
      renderSavedJobs(jobs || []);
    } catch (err) {
      console.error(err);
      savedContainer.innerHTML = "<p class=\"empty-state\">Server error.</p>";
    }
  };

  const renderAlerts = (list) => {
    if (!alertsList) return;

    if (!list.length) {
      alertsList.innerHTML = "<p class=\"empty-state\">No alerts yet.</p>";
      return;
    }

    alertsList.innerHTML = "";
    list.forEach(alert => {
      const filters = [
        alert.keyword ? `Keyword: ${esc(alert.keyword)}` : "",
        alert.location ? `Location: ${esc(alert.location)}` : "",
        alert.category ? `Category: ${esc(alert.category)}` : "",
        alert.job_type ? `Type: ${esc(alert.job_type)}` : ""
      ].filter(Boolean).join(" | ");

      alertsList.innerHTML += `
        <div class="alert-card">
          <div>
            <div class="alert-title">${filters || "All jobs"}</div>
            <div class="p-muted">Frequency: ${esc(alert.frequency)}</div>
          </div>
          <div class="alert-actions">
            <button class="btn btn-outline" type="button" data-action="toggle" data-id="${alert.id}">
              ${alert.is_active ? "Deactivate" : "Activate"}
            </button>
            <button class="btn btn-outline" type="button" data-action="delete" data-id="${alert.id}">Delete</button>
          </div>
        </div>
      `;
    });
  };

  const isShiftRule = (alert) => {
    const type = String(alert?.job_type || "").toLowerCase();
    return type === "shift";
  };

  const renderShiftRules = (list) => {
    if (!shiftAlertRules) return;

    const rules = (list || []).filter(isShiftRule);
    if (!rules.length) {
      shiftAlertRules.innerHTML = "<p class=\"empty-state\">No shift alert preferences yet.</p>";
      return;
    }

    shiftAlertRules.innerHTML = "";
    rules.forEach((alert) => {
      const filters = [
        alert.keyword ? `Keyword: ${esc(alert.keyword)}` : "",
        alert.location ? `Location: ${esc(alert.location)}` : "",
        alert.category ? `Category: ${esc(alert.category)}` : ""
      ].filter(Boolean).join(" | ");

      shiftAlertRules.innerHTML += `
        <div class="alert-card">
          <div>
            <div class="alert-title">${filters || "All shift jobs"}</div>
            <div class="p-muted">Type: Shift • Frequency: ${esc(alert.frequency || "daily")}</div>
          </div>
          <div class="alert-actions">
            <button class="btn btn-outline" type="button" data-action="edit-shift-rule" data-id="${alert.id}">Edit</button>
            <button class="btn btn-outline" type="button" data-action="toggle-shift-rule" data-id="${alert.id}">
              ${alert.is_active ? "Deactivate" : "Activate"}
            </button>
            <button class="btn btn-outline" type="button" data-action="delete-shift-rule" data-id="${alert.id}">Delete</button>
          </div>
        </div>
      `;
    });
  };

  const resetShiftAlertBuilder = () => {
    editingShiftAlertId = null;
    shiftAlertForm?.reset();
    const submitBtn = shiftAlertForm?.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "Save Shift Alert";
  };

  const startEditingShiftRule = (alert) => {
    if (!shiftAlertBuilder || !alert) return;

    editingShiftAlertId = alert.id;
    const keywordInput = document.getElementById("shiftAlertKeyword");
    const locationInput = document.getElementById("shiftAlertLocation");
    const categoryInput = document.getElementById("shiftAlertCategory");
    const frequencyInput = document.getElementById("shiftAlertFrequency");
    if (keywordInput) keywordInput.value = alert.keyword || "";
    if (locationInput) locationInput.value = alert.location || "";
    if (categoryInput) categoryInput.value = alert.category || "";
    if (frequencyInput) frequencyInput.value = alert.frequency || "daily";

    const submitBtn = shiftAlertForm?.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "Update Shift Alert";

    shiftAlertBuilder.style.display = "block";
    keywordInput?.focus();
  };

  const loadAlerts = async () => {
    if (!alertsList) return;
    try {
      const res = await authFetch(`${API}/job-alerts`);
      const data = await res.json();
      if (!res.ok) {
        alertsList.innerHTML = "<p class=\"empty-state\">Failed to load alerts.</p>";
        return;
      }
      alerts = data || [];
      renderAlerts(alerts);
      renderShiftRules(alerts);
    } catch (err) {
      console.error(err);
      alertsList.innerHTML = "<p class=\"empty-state\">Server error.</p>";
      if (shiftAlertRules) {
        shiftAlertRules.innerHTML = "<p class=\"empty-state\">Server error.</p>";
      }
    }
  };

  const renderShiftAlerts = (items) => {
    if (!shiftAlertsList) return;

    // Filter for only active shift alerts (deadline and shift end still valid)
    const activeItems = items.filter(item => {
      const now = new Date();
      const shiftEnd = item.shift_end ? new Date(item.shift_end) : null;
      const isOpenForApplications = Number(item.is_open_for_applications) === 1;
      return shiftEnd && shiftEnd > now && isOpenForApplications;
    });

    if (!activeItems.length) {
      shiftAlertsList.innerHTML = "<p class=\"empty-state\">No active shift alerts.</p>";
      if (shiftAlertCount) shiftAlertCount.textContent = "0";
      return;
    }

    const unread = activeItems.filter(item => !item.is_read).length;
    if (shiftAlertCount) shiftAlertCount.textContent = String(unread);

    shiftAlertsList.innerHTML = "";
    activeItems.forEach(item => {
      const pay = item.shift_pay_cents ? `$${(item.shift_pay_cents / 100).toFixed(2)}` : "";
      const start = item.shift_start ? new Date(item.shift_start).toLocaleString() : "";
      const end = item.shift_end ? new Date(item.shift_end).toLocaleString() : "";
      const time = start && end ? `${start} - ${end}` : start || end;
      const meta = [pay, time, esc(item.location || "")].filter(v => v !== "").join(" \u2022 ");
      const status = esc((item.status || "posted").replace(/_/g, " "));

      shiftAlertsList.innerHTML += `
        <div class="shift-alert-card ${item.is_read ? "" : "unread"}">
          <div>
            <div class="shift-alert-title">${esc(item.title)}</div>
            <div class="p-muted">${meta}</div>
            <div class="p-muted">Status: ${status}</div>
          </div>
          <div class="shift-alert-actions">
            <a class="btn btn-outline" href="apply.html?jobId=${item.job_id}">Apply</a>
            <button class="btn btn-outline" type="button" data-action="read" data-id="${item.id}">
              Mark read
            </button>
          </div>
        </div>
      `;
    });
  };

  const loadShiftAlerts = async () => {
    if (!shiftAlertsList) return;
    try {
      const res = await authFetch(`${API}/job-alerts/shift-notifications`);
      const data = await res.json();
      if (!res.ok) {
        shiftAlertsList.innerHTML = "<p class=\"empty-state\">Failed to load shift alerts.</p>";
        return;
      }
      renderShiftAlerts(data || []);
    } catch (err) {
      console.error(err);
      shiftAlertsList.innerHTML = "<p class=\"empty-state\">Server error.</p>";
    }
  };

  const renderJobAlerts = (items) => {
    if (!jobAlertsList) return;

    const activeItems = items.filter(item => {
      const now = new Date();
      const deadline = item.application_deadline ? new Date(item.application_deadline) : null;
      const isOpenForApplications = Number(item.is_open_for_applications) === 1;
      return isOpenForApplications && (!deadline || deadline > now);
    });

    if (!activeItems.length) {
      jobAlertsList.innerHTML = "<p class=\"empty-state\">No matching job alerts with valid deadlines.</p>";
      if (jobAlertCount) jobAlertCount.textContent = "0";
      return;
    }

    if (jobAlertCount) jobAlertCount.textContent = String(activeItems.length);

    jobAlertsList.innerHTML = "";
    activeItems.forEach(item => {
      const deadline = item.application_deadline ? new Date(item.application_deadline) : null;
      const deadlineText = deadline ? deadline.toLocaleString() : "Open";
      const meta = [item.job_type, item.category, item.location].filter(Boolean).map(esc).join(" \u2022 ");
      const salary = item.salary ? esc(String(item.salary)) : "";

      jobAlertsList.innerHTML += `
        <div class="job-alert-card">
          <div>
            <div class="job-alert-title">${esc(item.title)}</div>
            <div class="p-muted">${meta}</div>
            ${salary ? `<div class="p-muted">Salary: ${salary}</div>` : ""}
            <div class="p-muted">Deadline: ${deadlineText}</div>
          </div>
          <div class="job-alert-actions">
            <a class="btn btn-outline" href="job.html?jobId=${item.id}">View</a>
            <a class="btn btn-outline" href="apply.html?jobId=${item.id}">Apply</a>
          </div>
        </div>
      `;
    });
  };

  const loadJobAlerts = async () => {
    if (!jobAlertsList) return;
    try {
      const res = await authFetch(`${API}/job-alerts/job-notifications`);
      const data = await res.json();
      if (!res.ok) {
        jobAlertsList.innerHTML = "<p class=\"empty-state\">Failed to load job alerts.</p>";
        return;
      }
      renderJobAlerts(data || []);
    } catch (err) {
      console.error(err);
      jobAlertsList.innerHTML = "<p class=\"empty-state\">Server error.</p>";
    }
  };

  try {
    const res = await authFetch(`${API}/applications/my`);
    const apps = await res.json();

    if (!res.ok) {
      container.innerHTML = "<p class=\"empty-state\">Failed to load applications</p>";
      return;
    }

    allApps = apps || [];
    setStats(allApps);
    applyFilters();
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p class=\"empty-state\">Server error</p>";
  }

  await loadSavedJobs();
  await loadAlerts();
  await loadShiftAlerts();

  searchInput?.addEventListener("input", applyFilters);
  statusFilter?.addEventListener("change", applyFilters);
  sortBy?.addEventListener("change", applyFilters);

  await loadJobAlerts();

  refreshJobAlerts?.addEventListener("click", loadJobAlerts);

  savedContainer?.addEventListener("click", async (event) => {
    const button = event.target.closest(".save-btn");
    if (!button) return;

    const jobId = button.getAttribute("data-save-id");
    if (!jobId) return;

    try {
      const res = await authFetch(`${API}/saved-jobs/${jobId}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to remove saved job");
        return;
      }

      await loadSavedJobs();
    } catch (err) {
      console.error(err);
      alert("Failed to remove saved job");
    }
  });

  container?.addEventListener("click", async (event) => {
    const action = event.target.getAttribute("data-action");
    const jobId = event.target.getAttribute("data-job-id");
    if (action !== "worker-confirm" || !jobId) return;

    try {
      const res = await authFetch(`${API}/shifts/${jobId}/worker-confirm`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to confirm shift");
        return;
      }
      alert(data.message || "Shift confirmed");
      const refresh = await authFetch(`${API}/applications/my`);
      allApps = await refresh.json();
      setStats(allApps);
      applyFilters();
    } catch (err) {
      console.error(err);
      alert("Failed to confirm shift");
    }
  });

  alertForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      keyword: document.getElementById("alertKeyword").value.trim(),
      location: document.getElementById("alertLocation").value.trim(),
      category: document.getElementById("alertCategory").value.trim(),
      job_type: document.getElementById("alertType").value.trim(),
      frequency: document.getElementById("alertFrequency").value
    };

    try {
      const res = await authFetch(`${API}/job-alerts`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to create alert");
        return;
      }

      alertForm.reset();
      await loadAlerts();
    } catch (err) {
      console.error(err);
      alert("Failed to create alert");
    }
  });

  alertsList?.addEventListener("click", async (event) => {
    const action = event.target.getAttribute("data-action");
    const alertId = event.target.getAttribute("data-id");
    if (!action || !alertId) return;

    const selected = alerts.find(item => String(item.id) === String(alertId));
    if (!selected) return;

    if (action === "delete") {
      try {
        const res = await authFetch(`${API}/job-alerts/${alertId}`, {
          method: "DELETE"
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || "Failed to delete alert");
          return;
        }
        await loadAlerts();
      } catch (err) {
        console.error(err);
        alert("Failed to delete alert");
      }
      return;
    }

    if (action === "toggle") {
      const payload = {
        keyword: selected.keyword || "",
        location: selected.location || "",
        category: selected.category || "",
        job_type: selected.job_type || "",
        frequency: selected.frequency || "daily",
        is_active: selected.is_active ? 0 : 1
      };

      try {
        const res = await authFetch(`${API}/job-alerts/${alertId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || "Failed to update alert");
          return;
        }
        await loadAlerts();
      } catch (err) {
        console.error(err);
        alert("Failed to update alert");
      }
    }
  });

  refreshShiftAlerts?.addEventListener("click", loadShiftAlerts);

  createShiftAlertBtn?.addEventListener("click", async () => {
    if (!shiftAlertBuilder) return;
    if (shiftAlertBuilder.style.display === "none") {
      resetShiftAlertBuilder();
      shiftAlertBuilder.style.display = "block";
    } else {
      shiftAlertBuilder.style.display = "none";
      resetShiftAlertBuilder();
    }
    if (shiftAlertBuilder.style.display === "block") {
      document.getElementById("shiftAlertKeyword")?.focus();
    }
  });

  cancelShiftAlertBtn?.addEventListener("click", () => {
    if (shiftAlertBuilder) shiftAlertBuilder.style.display = "none";
    resetShiftAlertBuilder();
  });

  shiftAlertForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      keyword: (document.getElementById("shiftAlertKeyword")?.value || "").trim(),
      location: (document.getElementById("shiftAlertLocation")?.value || "").trim(),
      category: (document.getElementById("shiftAlertCategory")?.value || "").trim(),
      job_type: "Shift",
      frequency: (document.getElementById("shiftAlertFrequency")?.value || "daily").trim()
    };

    if (!payload.keyword && !payload.location && !payload.category) {
      alert("Please add at least one filter (keyword, location, or category).");
      return;
    }

    try {
      const isEdit = Number.isFinite(Number(editingShiftAlertId));
      const targetUrl = isEdit
        ? `${API}/job-alerts/${editingShiftAlertId}`
        : `${API}/job-alerts`;

      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? { ...payload, is_active: 1 }
        : payload;

      const res = await authFetch(targetUrl, {
        method,
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "Failed to create shift alert");
        return;
      }

      if (window.toast) {
        toast(isEdit ? "Shift alert updated." : "Shift alert preference saved.");
      }
      resetShiftAlertBuilder();
      if (shiftAlertBuilder) shiftAlertBuilder.style.display = "none";
      await loadAlerts();
      await loadShiftAlerts();
    } catch (err) {
      console.error(err);
      alert("Failed to create shift alert");
    }
  });

  shiftAlertRules?.addEventListener("click", async (event) => {
    const action = event.target.getAttribute("data-action");
    const alertId = event.target.getAttribute("data-id");
    if (!action || !alertId) return;

    const selected = alerts.find(item => String(item.id) === String(alertId));
    if (!selected || !isShiftRule(selected)) return;

    if (action === "edit-shift-rule") {
      startEditingShiftRule(selected);
      return;
    }

    if (action === "delete-shift-rule") {
      try {
        const res = await authFetch(`${API}/job-alerts/${alertId}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.message || "Failed to delete shift alert");
          return;
        }
        await loadAlerts();
        await loadShiftAlerts();
      } catch (err) {
        console.error(err);
        alert("Failed to delete shift alert");
      }
      return;
    }

    if (action === "toggle-shift-rule") {
      try {
        const res = await authFetch(`${API}/job-alerts/${alertId}`, {
          method: "PUT",
          body: JSON.stringify({
            keyword: selected.keyword || "",
            location: selected.location || "",
            category: selected.category || "",
            job_type: "Shift",
            frequency: selected.frequency || "daily",
            is_active: selected.is_active ? 0 : 1
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.message || "Failed to update shift alert");
          return;
        }
        await loadAlerts();
      } catch (err) {
        console.error(err);
        alert("Failed to update shift alert");
      }
    }
  });

  shiftAlertsList?.addEventListener("click", async (event) => {
    const action = event.target.getAttribute("data-action");
    const id = event.target.getAttribute("data-id");
    if (action !== "read" || !id) return;

    try {
      const res = await authFetch(`${API}/job-alerts/shift-notifications/${id}/read`, {
        method: "PUT"
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to mark read");
        return;
      }
      await loadShiftAlerts();
    } catch (err) {
      console.error(err);
      alert("Failed to mark read");
    }
  });
});
