document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");
  let user = null;
  
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch (err) {
      console.error("Invalid user data");
    }
  }

  let allShifts = [];
  let filteredShifts = [];
  let userAlerts = [];

  const shiftsGrid = document.getElementById("shiftsGrid");
  const emptyState = document.getElementById("emptyState");
  const createAlertBtn = document.getElementById("createAlertBtn");
  const createAlertModal = document.getElementById("createAlertModal");
  const closeAlertModal = document.getElementById("closeAlertModal");
  const cancelAlertBtn = document.getElementById("cancelAlertBtn");
  const saveAlertBtn = document.getElementById("saveAlertBtn");
  const alertsSummary = document.getElementById("alertsSummary");
  const manageAlertsBtn = document.getElementById("manageAlertsBtn");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  
  // Filter inputs
  const shiftLocation = document.getElementById("shiftLocation");
  const shiftPayMin = document.getElementById("shiftPayMin");
  const shiftDateStart = document.getElementById("shiftDateStart");

  const loadShiftJobs = async () => {
    try {
      const res = await (token ? authFetch : fetch)(`${API}/jobs`);
      const jobs = await res.json();
      
      // Filter for shift jobs only
      allShifts = (jobs || []).filter(job => job.is_shift);
      filteredShifts = [...allShifts];
      renderShifts();
    } catch (err) {
      console.error("Failed to load shifts:", err);
      if (shiftsGrid) shiftsGrid.innerHTML = '<p class="p-muted" style="grid-column: 1/-1;">Failed to load shifts</p>';
    }
  };

  const loadUserAlerts = async () => {
    if (!token) return;
    
    try {
      const res = await authFetch(`${API}/job-alerts`);
      userAlerts = (await res.json()) || [];
      renderAlertsSummary();
    } catch (err) {
      console.error("Failed to load alerts:", err);
    }
  };

  const renderShifts = () => {
    if (filteredShifts.length === 0) {
      shiftsGrid.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    shiftsGrid.classList.remove("hidden");
    emptyState.classList.add("hidden");

    shiftsGrid.innerHTML = filteredShifts.map(shift => `
      <div class="job-card shift-card">
        <div class="job-card-top">
          <div>
            <h3>${esc(shift.title || "Shift Job")}</h3>
            <div class="job-meta">
              <span class="meta-item">
                <i class="fa-solid fa-map-pin"></i> ${esc(shift.location || "Remote")}
              </span>
              <span class="meta-item badge-shift">
                <i class="fa-solid fa-hourglass-end"></i> Shift
              </span>
            </div>
          </div>
          <div class="job-card-badges">
            ${shift.is_premium ? '<span class="badge badge-premium">Premium</span>' : ''}
            ${shift.is_approved ? '<span class="badge badge-verified">Verified</span>' : ''}
          </div>
        </div>

        <p class="job-desc">${esc(shift.description || "")}</p>

        <div class="shift-details" style="margin-top: 12px; padding: 12px; background: var(--surface-2); border-radius: 8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <p class="p-muted" style="font-size: 12px; margin-bottom: 4px;">Pay</p>
              <p style="font-size: 16px; font-weight: 600; color: #10b981;">$${(shift.shift_pay_cents / 100).toFixed(2)}/hour</p>
            </div>
            <div>
              <p class="p-muted" style="font-size: 12px; margin-bottom: 4px;">Time</p>
              <p style="font-size: 14px; font-weight: 600;">
                ${new Date(shift.shift_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                -
                ${new Date(shift.shift_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        </div>

        <div class="job-card-actions" style="margin-top: 12px;">
          <a href="apply.html?jobId=${shift.id}" class="btn btn-primary" style="flex: 1;">
            <i class="fa-solid fa-paper-plane"></i> Apply Now
          </a>
          <button class="btn btn-outline save-shift-btn" data-job-id="${shift.id}">
            <i class="fa-solid fa-heart"></i>
          </button>
        </div>
      </div>
    `).join("");
  };

  const renderAlertsSummary = () => {
    if (!token) {
      alertsSummary.innerHTML = '<p class="p-muted">Login to create alerts</p>';
      return;
    }

    if (userAlerts.length === 0) {
      alertsSummary.innerHTML = '<p class="p-muted">No shift alerts yet. Create one to get notifications!</p>';
      return;
    }

    alertsSummary.innerHTML = userAlerts
      .filter(alert => !alert.is_removed)
      .slice(0, 3)
      .map(alert => `
        <div style="padding: 10px; background: var(--surface-2); border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="margin: 0; font-weight: 600; font-size: 13px;">${esc(alert.title || "Shift Alert")}</p>
            <p class="p-muted" style="margin: 4px 0 0 0; font-size: 12px;">
              ${esc(alert.keyword || "Any shift type")}${alert.location ? ` • ${esc(alert.location)}` : ""}
            </p>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="btn-icon" onclick="editAlert(${alert.id})" style="background: none; border: none; color: var(--primary, #2563eb); cursor: pointer;" title="Edit alert">
              <i class="fa-solid fa-pencil"></i>
            </button>
            <button class="btn-icon" onclick="removeAlert(${alert.id})" style="background: none; border: none; color: #ef4444; cursor: pointer;" title="Delete alert">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `).join("") + (userAlerts.length > 3 ? `<p class="p-muted" style="margin-top: 8px; font-size: 12px;">+${userAlerts.length - 3} more alerts</p>` : "");
  };

  const applyFilters = () => {
    filteredShifts = allShifts.filter(shift => {
      const location = shiftLocation.value.toLowerCase();
      const payMin = Number(shiftPayMin.value) || 0;
      const date = shiftDateStart.value;

      if (location && !shift.location.toLowerCase().includes(location)) {
        return false;
      }

      if (payMin > 0 && (shift.shift_pay_cents / 100) < payMin) {
        return false;
      }

      if (date) {
        const shiftDate = new Date(shift.shift_start).toISOString().split('T')[0];
        if (shiftDate !== date) {
          return false;
        }
      }

      return true;
    });

    renderShifts();
  };

  const clearFilters = () => {
    shiftLocation.value = "";
    shiftPayMin.value = "";
    shiftDateStart.value = "";
    filteredShifts = [...allShifts];
    renderShifts();
  };

  // Modal handlers
  let _editingAlertId = null;

  const _resetAlertModal = () => {
    _editingAlertId = null;
    document.getElementById("alertTitle").value = "";
    document.getElementById("alertLocation").value = "";
    document.getElementById("alertShiftType").value = "";
    document.getElementById("alertPayMin").value = "";
    document.querySelectorAll(".days-select input").forEach(cb => { cb.checked = false; });
    document.getElementById("alertNotifications").checked = true;
    const h3 = createAlertModal.querySelector("h3");
    if (h3) h3.innerHTML = '<i class="fa-solid fa-bell"></i> Create Shift Alert';
    const saveBtn = document.getElementById("saveAlertBtn");
    if (saveBtn) saveBtn.textContent = "Create Alert";
  };

  const openCreateAlertModal = () => {
    if (!token) {
      alert("Please login first to create alerts");
      window.location.href = "login.html";
      return;
    }
    _resetAlertModal();
    createAlertModal.classList.remove("hidden");
  };

  const closeCreateAlertModal = () => {
    createAlertModal.classList.add("hidden");
    _resetAlertModal();
  };

  const saveAlert = async () => {
    const title = document.getElementById("alertTitle").value.trim();
    const location = document.getElementById("alertLocation").value.trim();
    const shiftTypeKeyword = document.getElementById("alertShiftType").value.trim();
    const payMin = Number(document.getElementById("alertPayMin").value) || 0;
    const daysCheckboxes = document.querySelectorAll(".days-select input:checked");
    const days = Array.from(daysCheckboxes).map(cb => cb.value).join(",");
    const notifications = document.getElementById("alertNotifications").checked;

    if (!title) {
      alert("Please enter an alert name");
      return;
    }

    const isEditing = !!_editingAlertId;

    try {
      const url = isEditing
        ? `${API}/job-alerts/${_editingAlertId}`
        : `${API}/job-alerts`;
      const res = await authFetch(url, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify({
          title,
          keyword: shiftTypeKeyword,
          location,
          job_type: "Shift",
          min_pay_cents: Math.round(payMin * 100),
          preferred_days: days,
          notifications_enabled: notifications,
          is_shift_alert: true,
          frequency: "daily",
          is_active: 1
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || data.error || (isEditing ? "Failed to update alert" : "Failed to create alert"));
        return;
      }

      alert(isEditing ? "Alert updated!" : "Alert created! You'll get notified when matching shifts are posted.");
      closeCreateAlertModal();
      await loadUserAlerts();
    } catch (err) {
      console.error(err);
      alert(isEditing ? "Failed to update alert" : "Failed to create alert");
    }
  };

  // Event listeners
  createAlertBtn?.addEventListener("click", openCreateAlertModal);
  closeAlertModal?.addEventListener("click", closeCreateAlertModal);
  cancelAlertBtn?.addEventListener("click", closeCreateAlertModal);
  saveAlertBtn?.addEventListener("click", saveAlert);
  applyFiltersBtn?.addEventListener("click", applyFilters);
  clearFiltersBtn?.addEventListener("click", clearFilters);

  // Make removeAlert globally accessible
  window.removeAlert = async (alertId) => {
    if (!confirm("Remove this alert?")) return;

    try {
      const res = await authFetch(`${API}/job-alerts/${alertId}`, {
        method: "DELETE"
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || data.error || "Failed to remove alert");
        return;
      }
      await loadUserAlerts();
    } catch (err) {
      console.error(err);
      alert("Failed to remove alert");
    }
  };

  // Make editAlert globally accessible
  window.editAlert = (alertId) => {
    const alert_item = userAlerts.find(a => a.id === alertId);
    if (!alert_item) return;

    _editingAlertId = alertId;

    // Prefill form
    document.getElementById("alertTitle").value = alert_item.title || alert_item.keyword || "";
    document.getElementById("alertLocation").value = alert_item.location || "";
    document.getElementById("alertShiftType").value = alert_item.keyword || "";
    document.getElementById("alertPayMin").value =
      alert_item.min_pay_cents ? (alert_item.min_pay_cents / 100).toFixed(2) : "";
    // Reset and repopulate days
    document.querySelectorAll(".days-select input").forEach(cb => { cb.checked = false; });
    if (alert_item.preferred_days) {
      const days = alert_item.preferred_days.split(",").map(d => d.trim());
      document.querySelectorAll(".days-select input").forEach(cb => {
        if (days.includes(cb.value)) cb.checked = true;
      });
    }
    document.getElementById("alertNotifications").checked =
      alert_item.notifications_enabled !== false;

    // Update modal heading and button
    const h3 = createAlertModal.querySelector("h3");
    if (h3) h3.innerHTML = '<i class="fa-solid fa-pencil"></i> Edit Shift Alert';
    const saveBtn = document.getElementById("saveAlertBtn");
    if (saveBtn) saveBtn.textContent = "Update Alert";

    createAlertModal.classList.remove("hidden");
  };

  // Initial load
  await loadShiftJobs();
  await loadUserAlerts();
});
