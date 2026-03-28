// Notifications Settings Module
const NotificationsSettings = (() => {
  const API = window.API || "http://localhost:3000/api";

  // Load user's notification preferences
  const loadPreferences = async () => {
    try {
      const response = await fetch(`${API}/notifications/preferences`, {
        headers: authHeaders()
      });

      if (!response.ok) {
        console.error("Failed to load notification preferences");
        return null;
      }

      const prefs = await response.json();
      applyPreferences(prefs);
      return prefs;
    } catch (err) {
      console.error("[Notifications] Load failed:", err);
      return null;
    }
  };

  // Apply preferences to form controls
  const applyPreferences = (prefs) => {
    const jobAlertCheckbox = document.getElementById("notif-job-alerts");
    const appUpdateCheckbox = document.getElementById("notif-app-updates");
    const supportCheckbox = document.getElementById("notif-support");
    const savedJobCheckbox = document.getElementById("notif-saved-jobs");
    const promoCheckbox = document.getElementById("notif-promo");
    const frequencySelect = document.getElementById("notif-frequency");

    if (jobAlertCheckbox) jobAlertCheckbox.checked = prefs.job_alert_emails !== false;
    if (appUpdateCheckbox) appUpdateCheckbox.checked = prefs.application_update_emails !== false;
    if (supportCheckbox) supportCheckbox.checked = prefs.support_reply_emails !== false;
    if (savedJobCheckbox) savedJobCheckbox.checked = prefs.saved_job_update_emails !== false;
    if (promoCheckbox) promoCheckbox.checked = prefs.promotional_emails === true;
    if (frequencySelect) frequencySelect.value = prefs.email_frequency || "immediate";
  };

  // Save preferences to backend
  const savePreferences = async () => {
    const jobAlertCheckbox = document.getElementById("notif-job-alerts");
    const appUpdateCheckbox = document.getElementById("notif-app-updates");
    const supportCheckbox = document.getElementById("notif-support");
    const savedJobCheckbox = document.getElementById("notif-saved-jobs");
    const promoCheckbox = document.getElementById("notif-promo");
    const frequencySelect = document.getElementById("notif-frequency");

    const payload = {
      job_alert_emails: jobAlertCheckbox?.checked || false,
      application_update_emails: appUpdateCheckbox?.checked || false,
      support_reply_emails: supportCheckbox?.checked || false,
      saved_job_update_emails: savedJobCheckbox?.checked || false,
      promotional_emails: promoCheckbox?.checked || false,
      email_frequency: frequencySelect?.value || "immediate"
    };

    try {
      const response = await fetch(`${API}/notifications/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast("✅ Notification preferences saved", "success");
        return true;
      } else {
        showToast("❌ Failed to save preferences", "error");
        return false;
      }
    } catch (err) {
      console.error("[Notifications] Save failed:", err);
      showToast("❌ Error saving preferences", "error");
      return false;
    }
  };

  // Initialize event listeners
  const init = () => {
    const saveButton = document.getElementById("notif-save-btn");
    if (saveButton) {
      saveButton.addEventListener("click", savePreferences);
    }

    // Auto-save on change (optional)
    const inputs = document.querySelectorAll(
      "#notif-job-alerts, #notif-app-updates, #notif-support, #notif-saved-jobs, #notif-promo, #notif-frequency"
    );
    inputs.forEach((input) => {
      input.addEventListener("change", () => {
        // Optional: auto-save
        // savePreferences();
      });
    });

    // Load existing preferences
    loadPreferences();
  };

  return {
    init,
    loadPreferences,
    savePreferences
  };
})();

// Show toast notification (requires toast function from utils)
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === "success" ? "#4caf50" : type === "error" ? "#f44336" : "#2196f3"};
    color: white;
    border-radius: 4px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Helper to get auth headers
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    NotificationsSettings.init();
  });
} else {
  NotificationsSettings.init();
}
