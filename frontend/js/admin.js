(() => {
  const adminToken = localStorage.getItem("token");
  const rawUser = localStorage.getItem("user");
  let adminUser = null;
  if (rawUser) {
    try {
      adminUser = JSON.parse(rawUser);
    } catch (err) {
      console.error("Invalid JSON in localStorage.user", err);
      localStorage.removeItem("user");
    }
  }

  if (!adminToken || !adminUser || !adminUser.is_admin) {
    alert("Access denied");
    window.location.href = "index.html";
    return;
  }

  let hasHandledAdminAuthFailure = false;
  const handleAdminAuthFailure = () => {
    if (hasHandledAdminAuthFailure) return;
    hasHandledAdminAuthFailure = true;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    alert("Your admin session expired. Please login again.");
    window.location.href = "login.html?redirect=admin.html";
  };

  const baseAdminFetch = window.authFetch
    ? window.authFetch
    : (url, options = {}) => {
        return fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
            ...(options.headers || {})
          }
        });
      };

  const adminAuthFetch = async (url, options = {}) => {
    const res = await baseAdminFetch(url, options);
    if (res.status === 401) {
      handleAdminAuthFailure();
    }
    return res;
  };

  let adminJobsCache = [];
  let adminUsersCache = [];
  let editJobId = null;
  let reviewStatusFilter = "pending";
<<<<<<< HEAD
  let reviewSourceFilter = "portal";
  let grantHistoryFilter = "all";
  let supportFilter = "open";
  let activeSupportTicketId = null;
  let supportPollTimer = null;
  let supportMineOnly = false;
  let supportSocket = null;
  let lastSupportTicketsError = "";
  let lastSupportThreadError = "";
  let supportTicketsLoading = false;
  let supportThreadLoading = false;
  let lastSupportTicketsSignature = "";
  let lastSupportThreadSignature = "";
  let lastSupportTicketsFetchAt = 0;
  let lastSupportThreadFetchAt = 0;
  let supportRefreshTimer = null;
  let supportRetryTimer = null;
  let supportConsecutiveFailures = 0;

  const SUPPORT_MIN_REFRESH_MS = 1500;
  const SUPPORT_REFRESH_DEBOUNCE_MS = 500;
  const ADMIN_JOB_ACTION_KEY = "adminJobActionFeedback";

  const formatDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? "" : date.toLocaleString();
  };

  const buildSupportReplyTemplate = (templateKey) => {
    const adminName = String(adminUser?.name || "JobPortal support").trim();
    const signature = `\n\n- ${adminName}`;
    const templates = {
      greeting: `Hi, this is ${adminName} from JobPortal support. How can I help you today?`,
      checking: `Thanks for reaching out. ${adminName} is checking this for you now and will update you shortly.`,
      ask_steps: `${adminName} needs the page name and exact steps so this issue can be reproduced quickly.`,
      refresh_login: `${adminName} asks you to try a hard refresh (Ctrl+F5) and login again. Let us know if the issue still appears.`,
      issue_fixed: `${adminName} has applied a fix from our side. Please test again and confirm whether it is resolved.`
    };
    return `${templates[templateKey] || ""}${templates[templateKey] ? signature : ""}`.trim();
  };

  const storeAdminJobActionFeedback = (payload) => {
    try {
      sessionStorage.setItem(ADMIN_JOB_ACTION_KEY, JSON.stringify(payload));
    } catch (_err) {
      // ignore storage failures
    }
  };

  const consumeAdminJobActionFeedback = () => {
    try {
      const raw = sessionStorage.getItem(ADMIN_JOB_ACTION_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(ADMIN_JOB_ACTION_KEY);
      return JSON.parse(raw);
    } catch (_err) {
      sessionStorage.removeItem(ADMIN_JOB_ACTION_KEY);
      return null;
    }
  };

  const highlightAdminJobCard = (jobId, message) => {
    const card = document.querySelector(`[data-job-id="${String(jobId)}"]`);
    if (!card) return;

    card.style.border = "2px solid rgba(37, 99, 235, 0.9)";
    card.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.18)";
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof toast === "function" && message) {
      toast(message);
    }

    setTimeout(() => {
      card.style.border = "";
      card.style.boxShadow = "";
    }, 4500);
  };

  const applyPendingAdminJobFeedback = () => {
    const feedback = consumeAdminJobActionFeedback();
    if (!feedback?.jobId) return;
    const label = feedback.action === "reboost"
      ? `Re-boost confirmed for job #${feedback.jobId}`
      : `Job #${feedback.jobId} updated successfully`;
    setTimeout(() => highlightAdminJobCard(feedback.jobId, label), 120);
  };

  function buildSupportTicketsSignature(tickets) {
    return JSON.stringify(
      (tickets || []).map((t) => [
        t.ticket_id,
        t.status,
        Number(t.unread_admin_count || 0),
        t.updated_at || "",
        t.assigned_admin_id || ""
      ])
    );
  }

  function buildSupportThreadSignature(payload) {
    const ticket = payload?.ticket || {};
    const rows = Array.isArray(payload?.messages) ? payload.messages : [];
    return JSON.stringify({
      ticketId: ticket.ticket_id || "",
      status: ticket.status || "",
      unread: Number(ticket.unread_user_count || 0),
      messages: rows.map((m) => [m.id, m.sender_type, m.message, m.created_at])
    });
  }

  function scheduleSupportRefresh() {
    if (supportRefreshTimer) return;
    supportRefreshTimer = setTimeout(() => {
      supportRefreshTimer = null;
      loadSupportTickets(supportFilter, { force: true });
      loadSupportTicketMessages({ force: true });
    }, SUPPORT_REFRESH_DEBOUNCE_MS);
  }
=======
  let grantHistoryFilter = "all";
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7

  const adminJobForm = document.getElementById("adminJobForm");
  const adminJobTitle = document.getElementById("adminJobTitle");
  const adminJobLocation = document.getElementById("adminJobLocation");
  const adminJobType = document.getElementById("adminJobType");
  const adminJobCategory = document.getElementById("adminJobCategory");
  const adminJobCategoryCustomWrap = document.getElementById("adminJobCategoryCustomWrap");
  const adminJobCategoryCustom = document.getElementById("adminJobCategoryCustom");
  const adminJobDescription = document.getElementById("adminJobDescription");
  const adminJobPremium = document.getElementById("adminJobPremium");
  const adminJobSubmit = document.getElementById("adminJobSubmit");
  const adminJobCancel = document.getElementById("adminJobCancel");
  const autoApproveToggle = document.getElementById("autoApproveToggle");
  const autoApproveMeta = document.getElementById("autoApproveMeta");
  const saveAutoApproveBtn = document.getElementById("saveAutoApproveBtn");
  const supportTicketsContainer = document.getElementById("supportTickets");
  const supportThread = document.getElementById("supportThread");
  const supportThreadTitle = document.getElementById("supportThreadTitle");
  const supportThreadMeta = document.getElementById("supportThreadMeta");
  const supportInboxMeta = document.getElementById("supportInboxMeta");
  const supportReplyForm = document.getElementById("supportReplyForm");
  const supportReplyInput = document.getElementById("supportReplyInput");
  const supportQuickReplies = document.getElementById("supportQuickReplies");
  const jobAppsModal = document.getElementById("jobApplicationsModal");
  const jobAppsModalTitle = document.getElementById("jobApplicationsModalTitle");
  const jobAppsModalList = document.getElementById("jobApplicationsModalList");
  const jobAppsModalClose = document.getElementById("jobApplicationsModalClose");

  let activeApplicationsJobId = null;

  const baseJobCategories = new Set([
    "IT",
    "Marketing",
    "Finance",
    "Healthcare",
    "Education",
    "Engineering",
    "Sales",
    "Design",
    "Operations",
    "General"
  ]);

  const syncAdminCustomCategoryField = () => {
    const isOther = (adminJobCategory?.value || "").toLowerCase() === "other";
    if (adminJobCategoryCustomWrap) {
      adminJobCategoryCustomWrap.style.display = isOther ? "block" : "none";
    }
    if (!isOther && adminJobCategoryCustom) {
      adminJobCategoryCustom.value = "";
    }
  };

  const resolveAdminCategoryPayload = () => {
    const selected = (adminJobCategory?.value || "").trim();
    if (selected.toLowerCase() !== "other") {
      return { category: selected, category_custom: "" };
    }
    return {
      category: "Other",
      category_custom: (adminJobCategoryCustom?.value || "").trim()
    };
  };

  const loadSocketClient = () =>
    new Promise((resolve, reject) => {
      if (window.io) {
        resolve(window.io);
        return;
      }

      const existing = document.getElementById("socketIoClientScript");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.io), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = "socketIoClientScript";
      script.src = `${API.replace(/\/api$/, "")}/socket.io/socket.io.js`;
      script.onload = () => resolve(window.io);
      script.onerror = () => reject(new Error("Failed to load realtime client"));
      document.head.appendChild(script);
    });

  async function connectSupportRealtime() {
    if (!adminToken || supportSocket) return;
    try {
      const ioFactory = await loadSocketClient();
      if (!ioFactory) return;
      supportSocket = ioFactory(API.replace(/\/api$/, ""), {
        transports: ["websocket", "polling"],
        auth: { token: adminToken }
      });

      supportSocket.on("support:new-message", () => {
        scheduleSupportRefresh();
      });

      supportSocket.on("support:ticket-updated", () => {
        scheduleSupportRefresh();
      });
    } catch (err) {
      console.error("Failed to connect support realtime:", err);
    }
  }

  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get("payment");
  const sessionId = params.get("session_id");
  const mode = params.get("mode");
  const paidJobId = params.get("jobId");

  if (paymentStatus === "success" && (mode === "upgrade" || mode === "reboost") && sessionId && paidJobId) {
    adminAuthFetch(`${API}/payments/confirm`, {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        mode,
        jobId: paidJobId
      })
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Payment confirmation failed");
        return;
      }
      storeAdminJobActionFeedback({ action: mode, jobId: paidJobId, at: Date.now() });
      if (typeof toast === "function") {
        toast(mode === "reboost" ? `Job #${paidJobId} re-boosted successfully` : `Job #${paidJobId} upgraded to premium`);
      }
      window.history.replaceState({}, document.title, "admin.html");
      loadJobs();
    });
  }

  function renderJobMonetizationBadges(job) {
    const badges = [];

    if (job.is_premium) {
      badges.push('<span class="tag-pill bg-amber-100 text-amber-700">Premium</span>');
    }

    if (Number(job.reboost_count || 0) > 0) {
      badges.push(`<span class="tag-pill bg-indigo-100 text-indigo-700">Re-boosted ${Number(job.reboost_count)}x</span>`);
    }

    if (job.repost_of_job_id) {
      const parentTitle = (job.repost_of_title || "Original job").trim();
      badges.push(`<span class="tag-pill bg-violet-100 text-violet-700" title="${esc(parentTitle)}">Repost of #${esc(job.repost_of_job_id)}</span>`);
    }

    return badges.join("");
  }

  function renderJobMonetizationMeta(job) {
    const lines = [];

    if (Number(job.reboost_count || 0) > 0) {
      const lastReboosted = formatDateTime(job.last_reboosted_at);
      lines.push(lastReboosted ? `Last re-boosted: ${lastReboosted}` : "This job has been re-boosted.");
    }

    if (job.repost_of_job_id) {
      const parentTitle = (job.repost_of_title || "Original job").trim();
      lines.push(`Repost lineage: #${esc(job.repost_of_job_id)} from ${esc(parentTitle)}`);
    }

    if (!lines.length) return "";
    return `<div class="p-muted" style="margin-top:4px;">${lines.join(" • ")}</div>`;
  }

  function loadJobs() {
    adminAuthFetch(`${API}/admin/jobs`)
      .then(res => res.json())
      .then(jobs => {
        adminJobsCache = jobs;
        const jobsContainer = document.getElementById("jobs");
        if (!jobsContainer) {
          console.error("jobsContainer element not found");
          return;
        }

        if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
          jobsContainer.innerHTML = '<p class="empty-state">No jobs found.</p>';
          return;
        }

        jobsContainer.innerHTML = "";

        // Separate shift jobs from regular jobs; shift jobs are shown in the Shifts section
        const regularJobs = jobs.filter(j => !j.is_shift);
        const shiftJobs = jobs.filter(j => j.is_shift);

        if (!regularJobs.length) {
          jobsContainer.innerHTML = '<p class="empty-state">No regular jobs found.</p>';
        }

        // Render shift jobs in the shifts section
        renderShiftJobs(shiftJobs);

<<<<<<< HEAD

=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
        regularJobs.forEach(job => {
          const shiftBadge = "";
          const shiftPaid = "";
          const shiftAction = "";
          const moderationScore = Number.isFinite(Number(job.moderation_score))
            ? Number(job.moderation_score)
            : null;
          const moderationStatus = (job.moderation_status || "pending_manual_review").replace(/_/g, " ");
          const moderationReason = (job.moderation_reason || "No moderation notes").trim();
          const aiFlag = moderationReason.toLowerCase().includes("ai") ? "🤖" : "";
          const moderationMeta = `
            <div class="p-muted" style="margin-top:6px;">
              Moderation: <strong>${esc(moderationStatus)}</strong>
              ${moderationScore !== null ? `• Score: <strong>${moderationScore}</strong>` : ""}
              ${aiFlag}
            </div>
            <div class="p-muted" style="margin-top:4px;">Reason: ${esc(moderationReason)}</div>
          `;

          jobsContainer.innerHTML += `
            <article class="job-card admin-record" data-job-id="${esc(job.id)}">
              <div class="admin-record-head">
                <div>
                  <h4>${esc(job.title)}</h4>
                  <p class="p-muted">${esc(job.location || "No location")} \u2022 ${esc(job.job_type || job.jobType || "General")} \u2022 ${esc(job.category || "General")}</p>
                </div>
                <div class="admin-record-badges">
                  ${renderJobMonetizationBadges(job)}
                  ${shiftBadge ? '<span class="tag-pill bg-cyan-100 text-cyan-700">Shift</span>' : ""}
                  ${shiftPaid ? '<span class="tag-pill bg-green-100 text-green-700">Paid</span>' : ""}
                  <span class="tag-pill ${job.is_approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}">${job.is_approved ? "Approved" : "Pending"}</span>
                </div>
              </div>
              ${moderationMeta}
              ${renderJobMonetizationMeta(job)}
              <div class="admin-record-actions">
                <button class="btn btn-outline" onclick="editJob('${job.id}')">Edit</button>
                <button class="btn btn-outline" onclick="approveJob('${job.id}')">Approve</button>
                <button class="btn btn-outline" onclick="makePremium('${job.id}')">Premium</button>
                <button class="btn btn-outline" onclick="reboostJob('${job.id}')">Re-Boost</button>
                <button class="btn btn-outline" onclick="viewJobApplications('${job.id}')">Applications</button>
                <button class="btn btn-outline" onclick="deleteJob('${job.id}')">Delete</button>
                <button class="btn btn-outline" onclick="viewJobHistory('${job.id}')">View History</button>
                ${shiftAction}
              </div>
            </article>
          `;
        });
<<<<<<< HEAD

// Admin: View job action history (audit trail)
function viewJobHistory(jobId) {
  const modal = document.getElementById("jobHistoryModal");
  const title = document.getElementById("jobHistoryModalTitle");
  const list = document.getElementById("jobHistoryModalList");
  if (!modal || !title || !list) return;
  title.textContent = `Job Action History #${jobId}`;
  list.innerHTML = '<p class="p-muted">Loading...</p>';
  modal.classList.remove("hidden");
  adminAuthFetch(`${API}/admin/jobs/${jobId}/history`)
    .then(res => res.json())
    .then(history => {
      if (!Array.isArray(history) || !history.length) {
        list.innerHTML = '<p class="empty-state">No history found for this job.</p>';
        return;
      }
      list.innerHTML = renderJobHistoryListHtml(history);
    })
    .catch(err => {
      list.innerHTML = `<p class="empty-state" style="color:#ef4444;">${esc(err.message || "Failed to load history")}</p>`;
    });
}

function closeJobHistoryModal() {
  const modal = document.getElementById("jobHistoryModal");
  if (modal) modal.classList.add("hidden");
}

function renderJobHistoryListHtml(history) {
  return history.map(entry => {
    const actor = entry.actor_role === "admin" ? `Admin: ${esc(entry.actor_name || "(admin)")}` : `Employer: ${esc(entry.actor_name || "(employer)")}`;
    const action = esc(entry.action);
    const details = esc(entry.details || "");
    const at = entry.created_at ? new Date(entry.created_at).toLocaleString() : "";
    return `
      <article class="job-card admin-record">
        <div class="admin-record-head">
          <div>
            <h4>${action}</h4>
            <p class="p-muted">${actor}</p>
            <p class="p-muted">${at}</p>
          </div>
        </div>
        <div class="p-muted">${details}</div>
      </article>
    `;
  }).join("");
}

        applyPendingAdminJobFeedback();
=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
      })
      .catch(err => {
        console.error("Error loading jobs:", err);
        const jobsContainer = document.getElementById("jobs");
        if (jobsContainer) {
          jobsContainer.innerHTML = `<p class="empty-state" style="color: #ef4444;">Error loading jobs: ${err.message}</p>`;
        }
      });
  }

  function loadApplications() {
    adminAuthFetch(`${API}/applications/admin`)
      .then(res => res.json())
      .then(apps => {
<<<<<<< HEAD
        renderApplications(apps, "Applications", { containerId: "applications" });
=======
        renderApplications(apps, "Applications");
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
      })
      .catch(err => {
        console.error("Error loading applications:", err);
        const container = document.getElementById("applications");
        if (container) {
          container.innerHTML = `<p class="empty-state" style="color: #ef4444;">Error loading applications: ${err.message}</p>`;
        }
      });
  }

<<<<<<< HEAD
  function renderApplicationsListHtml(apps) {
    if (!apps.length) {
      return "<p>No applications found</p>";
    }

    return apps.map((app) => {
      const created = app.created_at
        ? new Date(app.created_at).toLocaleDateString()
        : "";

      const jobTitle = app.job_title ? app.job_title : "";
      const applicantName = app.applicant_name || app.full_name || app.user_name || "Candidate";
      const userRef = app.user_ref || (app.user_id ? `U${String(app.user_id).padStart(6, "0")}` : "U000000");
      const jobRef = app.job_ref || (app.job_id ? `J${String(app.job_id).padStart(6, "0")}` : "");

      return `
        <article class="job-card admin-record" data-job-id="${esc(app.job_id)}">
          ${jobTitle ? `<h4>${esc(jobTitle)}${jobRef ? ` <span class="p-muted">(${esc(jobRef)})</span>` : ""}</h4>` : ""}
          <p>${esc(applicantName)} <span class="p-muted">(${esc(userRef)})</span></p>
          <p>Status: <strong>${esc(app.status)}</strong></p>
          <p>Applied: ${created}</p>
          <div class="admin-record-actions" style="margin-top:10px;">
            <select id="status-${app.id}" class="form-input">
              <option value="pending" ${app.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="reviewed" ${app.status === "reviewed" ? "selected" : ""}>Reviewed</option>
              <option value="accepted" ${app.status === "accepted" ? "selected" : ""}>Accepted</option>
              <option value="rejected" ${app.status === "rejected" ? "selected" : ""}>Rejected</option>
            </select>
            <button class="btn btn-outline" onclick="updateApplicationStatus(${app.id})">Update</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function openJobApplicationsModal() {
    if (!jobAppsModal) return;
    jobAppsModal.classList.remove("hidden");
  }

  function closeJobApplicationsModal() {
    if (!jobAppsModal) return;
    jobAppsModal.classList.add("hidden");
  }

=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
  function loadUsers() {
    adminAuthFetch(`${API}/admin/users`)
      .then(res => res.json())
      .then(users => {
        adminUsersCache = Array.isArray(users) ? users : [];
        const usersContainer = document.getElementById("users");
        if (!usersContainer) return;

        if (!adminUsersCache.length) {
          usersContainer.innerHTML = "<p class=\"empty-state\">No users found.</p>";
          return;
        }

        usersContainer.innerHTML = "";
        adminUsersCache.forEach(user => {
          const role = user.role || (user.is_admin ? "admin" : "job_seeker");
          const created = user.created_at ? new Date(user.created_at).toLocaleDateString() : "";
          const blockedBadge = user.is_blocked
            ? '<span class="tag-pill bg-red-100 text-red-700">Blocked</span>'
            : '<span class="tag-pill bg-green-100 text-green-700">Active</span>';
          const adminBadge = user.is_admin
            ? '<span class="tag-pill bg-indigo-100 text-indigo-700">Admin</span>'
            : "";

          usersContainer.innerHTML += `
            <article class="job-card admin-record">
              <div class="admin-record-head">
                <div>
                  <h4>${esc(user.name || "Unnamed user")}</h4>
                  <p class="p-muted">${esc(user.email || "No email")}</p>
                  <p class="p-muted">Role: ${role}${created ? ` • Joined: ${created}` : ""}</p>
                </div>
                <div class="admin-record-badges">
                  ${blockedBadge}
                  ${adminBadge}
                </div>
              </div>
              <div class="admin-record-actions">
                <button class="btn btn-outline" onclick="toggleUserBlock(${user.id}, ${user.is_blocked ? 0 : 1})">
                  ${user.is_blocked ? "Unblock" : "Block"}
                </button>
                <button class="btn btn-outline" onclick="toggleUserVerify(${user.id}, ${user.verified ? 0 : 1})">
                  ${user.verified ? "Unverify" : "Verify"}
                </button>
                <button class="btn btn-outline" onclick="deleteUserAccount(${user.id})">Delete</button>
                ${user.is_admin ? "" : `<button class=\"btn btn-outline\" onclick=\"requestAdminGrant(${user.id})\">Request admin grant</button>`}
                ${user.is_admin ? "" : `<button class=\"btn btn-primary\" onclick=\"promoteUserToAdmin(${user.id})\">Make admin</button>`}
              </div>
            </article>
          `;
        });
      })
      .catch(err => {
        console.error("Error loading users:", err);
        const usersContainer = document.getElementById("users");
        if (usersContainer) {
          usersContainer.innerHTML = `<p class="empty-state" style="color: #ef4444;">Error loading users: ${err.message}</p>`;
        }
      });
  }

  function toggleUserBlock(userId, blocked) {
    const actionLabel = blocked ? "block" : "unblock";
    if (!confirm(`Are you sure you want to ${actionLabel} this user?`)) return;

    adminAuthFetch(`${API}/admin/users/${userId}/block`, {
      method: "PUT",
      body: JSON.stringify({ blocked: !!blocked })
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || `Failed to ${actionLabel} user`);
        return;
      }
      loadUsers();
    });
  }

  function toggleUserVerify(userId, verified) {
    adminAuthFetch(`${API}/admin/users/${userId}/verify`, {
      method: "PUT",
      body: JSON.stringify({ verified: !!verified })
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to update verification status");
        return;
      }
      loadUsers();
<<<<<<< HEAD
      loadCompanies();
=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
    });
  }

  function deleteUserAccount(userId) {
    if (!confirm("Delete this user account permanently?")) return;

    adminAuthFetch(`${API}/admin/users/${userId}`, {
      method: "DELETE"
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to delete user");
        return;
      }
      loadUsers();
    });
  }

  function requestAdminGrant(userId) {
    adminAuthFetch(`${API}/admin/users/${userId}/request-admin-grant`, {
      method: "POST"
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to request admin grant");
        return;
      }
<<<<<<< HEAD
      const approver = data?.approver_email ? `Approver: ${data.approver_email}` : "Approval requested.";
      alert(data.message || approver);
=======
      alert(data.message || "Approval requested. Ask test@sample.com for code.");
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
      loadGrantHistory();
    });
  }

  function promoteUserToAdmin(userId) {
<<<<<<< HEAD
    const approvalEmail = prompt("Enter approver email (leave blank to auto-match by approval code):", "");
    if (approvalEmail === null) return;

    const approvalCode = prompt("Enter approval code:");
=======
    const approvalEmail = prompt("Enter approver email (must be test@sample.com):", "test@sample.com");
    if (!approvalEmail) return;

    const approvalCode = prompt("Enter approval code received from test@sample.com:");
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
    if (!approvalCode) return;

    adminAuthFetch(`${API}/admin/users/${userId}/make-admin`, {
      method: "PUT",
      body: JSON.stringify({ approvalEmail: approvalEmail.trim(), approvalCode: approvalCode.trim() })
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to promote user");
        return;
      }
      alert(data.message || "User promoted to admin");
      loadUsers();
      loadGrantHistory();
    });
  }

  function loadGrantHistory(status = grantHistoryFilter) {
    grantHistoryFilter = status;
    const container = document.getElementById("grantHistory");
    if (!container) return;

    adminAuthFetch(`${API}/admin/users/grants/history?status=${encodeURIComponent(grantHistoryFilter)}`)
      .then(res => res.json())
      .then(rows => {
        const items = Array.isArray(rows) ? rows : [];
        if (!items.length) {
          container.innerHTML = "<p class=\"empty-state\">No grant history found for this filter.</p>";
          return;
        }

        container.innerHTML = "";
        items.forEach(item => {
          const created = item.created_at ? new Date(item.created_at).toLocaleString() : "";
          const expires = item.expires_at ? new Date(item.expires_at).toLocaleString() : "";
          const approved = item.approved_at ? new Date(item.approved_at).toLocaleString() : "";
          const statusLabel = (item.effective_status || item.status || "pending").toLowerCase();
          const statusClass = statusLabel === "approved"
            ? "bg-green-100 text-green-700"
            : statusLabel === "expired"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700";

          container.innerHTML += `
            <article class="job-card admin-record">
              <div class="admin-record-head">
                <div>
                  <h4>${esc(item.target_name || "Unknown user")} (${esc(item.target_email || "n/a")})</h4>
                  <p class="p-muted">Requested by: ${esc(item.requested_by_name || "Unknown")} (${esc(item.requested_by_email || "n/a")})</p>
                  <p class="p-muted">Approver: ${esc(item.approver_email || "n/a")}</p>
                  <p class="p-muted">Created: ${created}${expires ? ` • Expires: ${expires}` : ""}${approved ? ` • Approved: ${approved}` : ""}</p>
                </div>
                <div class="admin-record-badges">
                  <span class="tag-pill ${statusClass}">${statusLabel}</span>
                </div>
              </div>
            </article>
          `;
        });
      })
      .catch((err) => {
        console.error("Error loading grant history:", err);
        container.innerHTML = `<p class="empty-state" style="color: #ef4444;">Error loading grant history: ${err.message}</p>`;
      });
  }

  function setGrantHistoryFilter(status) {
    loadGrantHistory(status);
  }

  function loadReviewQueue(status = reviewStatusFilter) {
    reviewStatusFilter = status;

<<<<<<< HEAD
    adminAuthFetch(`${API}/admin/reviews?status=${encodeURIComponent(reviewStatusFilter)}&source=${encodeURIComponent(reviewSourceFilter)}`)
=======
    adminAuthFetch(`${API}/admin/reviews?status=${encodeURIComponent(reviewStatusFilter)}`)
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
      .then(res => res.json())
      .then(reviews => {
        const container = document.getElementById("reviewQueue");
        if (!container) {
          console.error("reviewQueue container not found");
          return;
        }

        if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
          const labels = {
            pending: "pending",
            approved: "published",
            hidden: "hidden"
          };
<<<<<<< HEAD
          const sourceLabel = reviewSourceFilter === "all" ? "reviews" : `${reviewSourceFilter} reviews`;
          container.innerHTML = `<p>No ${labels[reviewStatusFilter] || "matching"} ${sourceLabel}</p>`;
=======
          container.innerHTML = `<p>No ${labels[reviewStatusFilter] || "matching"} reviews</p>`;
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
          return;
        }

        container.innerHTML = "";
        reviews.forEach(review => {
          const stars = "★★★★★".slice(0, review.rating) + "☆☆☆☆☆".slice(0, 5 - review.rating);
          const created = review.created_at ? new Date(review.created_at).toLocaleString() : "";
          const emailRow = review.email ? `<p class="meta">${esc(review.email)}</p>` : "";
<<<<<<< HEAD
          const source = review.source || "portal";
          const sourceLabel = source === "company" ? "Company review" : "Portal review";
          const sourceBadge = `<span class="tag-pill ${source === "company" ? "bg-cyan-100 text-cyan-700" : "bg-indigo-100 text-indigo-700"}">${sourceLabel}</span>`;

          let actionButtons = `
            <button class="btn btn-outline" onclick="deleteReview(${review.id}, '${source}')">Delete</button>
=======

          let actionButtons = `
            <button class="btn btn-outline" onclick="deleteReview(${review.id})">Delete</button>
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
          `;

          if (reviewStatusFilter === "pending") {
            actionButtons = `
<<<<<<< HEAD
              <button class="btn btn-primary" onclick="approveReview(${review.id}, '${source}')">Approve</button>
              <button class="btn btn-outline" onclick="deleteReview(${review.id}, '${source}')">Delete</button>
            `;
          } else if (reviewStatusFilter === "approved") {
            actionButtons = `
              <button class="btn btn-outline" onclick="hideReview(${review.id}, '${source}')">Hide</button>
              <button class="btn btn-outline" onclick="deleteReview(${review.id}, '${source}')">Delete</button>
            `;
          } else if (reviewStatusFilter === "hidden") {
            actionButtons = `
              <button class="btn btn-primary" onclick="unhideReview(${review.id}, '${source}')">Unhide</button>
              <button class="btn btn-outline" onclick="deleteReview(${review.id}, '${source}')">Delete</button>
=======
              <button class="btn btn-primary" onclick="approveReview(${review.id})">Approve</button>
              <button class="btn btn-outline" onclick="deleteReview(${review.id})">Delete</button>
            `;
          } else if (reviewStatusFilter === "approved") {
            actionButtons = `
              <button class="btn btn-outline" onclick="hideReview(${review.id})">Hide</button>
              <button class="btn btn-outline" onclick="deleteReview(${review.id})">Delete</button>
            `;
          } else if (reviewStatusFilter === "hidden") {
            actionButtons = `
              <button class="btn btn-primary" onclick="unhideReview(${review.id})">Unhide</button>
              <button class="btn btn-outline" onclick="deleteReview(${review.id})">Delete</button>
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
            `;
          }

          container.innerHTML += `
            <div class="review-card">
              <div class="review-header">
                <div>
                  <h4>${esc(review.name)}</h4>
                  <p class="meta">${esc(review.role)}</p>
                  ${emailRow}
<<<<<<< HEAD
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                  ${sourceBadge}
                  <span class="review-stars">${stars}</span>
=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
                </div>
              </div>
              <p class="review-message">${esc(review.message)}</p>
              ${created ? `<p class="meta">Submitted: ${created}</p>` : ""}
              <div style="margin-top:12px; display:flex; gap:10px;">
                ${actionButtons}
              </div>
            </div>
          `;
        });
      })
      .catch(err => {
        console.error("Error loading reviews:", err);
        const container = document.getElementById("reviewQueue");
        if (container) {
          container.innerHTML = `<p class="empty-state" style="color: #ef4444;">Error loading reviews: ${err.message}</p>`;
        }
      });
  }

  function setReviewFilter(status) {
    loadReviewQueue(status);
  }

<<<<<<< HEAD
  function updateReviewSourceButtons() {
    const states = {
      portal: document.getElementById("reviewSourcePortal"),
      company: document.getElementById("reviewSourceCompany"),
      all: document.getElementById("reviewSourceAll")
    };

    Object.entries(states).forEach(([key, button]) => {
      if (!button) return;
      button.classList.toggle("btn-primary", key === reviewSourceFilter);
      button.classList.toggle("btn-ghost", key !== reviewSourceFilter);
    });
  }

  function setReviewSourceFilter(source) {
    reviewSourceFilter = source || "portal";
    updateReviewSourceButtons();
    loadReviewQueue(reviewStatusFilter);
  }

=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
  function renderShiftJobs(shiftJobs) {
    const container = document.getElementById("shiftEscrows");
    if (!container) return;

    // Clear any "shift jobs" header previously rendered so escrow data can be appended
    const existingHeader = container.querySelector(".shift-jobs-header");
    if (existingHeader) existingHeader.remove();
    const existingList = container.querySelector(".shift-jobs-list");
    if (existingList) existingList.remove();

    if (!shiftJobs || !shiftJobs.length) return;

    const header = document.createElement("div");
    header.className = "shift-jobs-header";
    header.innerHTML = `<h4 style="margin:10px 0 8px;">Shift Job Postings</h4>`;
    container.prepend(header);

    const list = document.createElement("div");
    list.className = "shift-jobs-list";

    shiftJobs.forEach(job => {
      const shiftStart = job.shift_start ? new Date(job.shift_start).toLocaleString() : "";
      const shiftEnd = job.shift_end ? new Date(job.shift_end).toLocaleString() : "";
      const wageLabel = job.shift_hourly_rate ? `$${job.shift_hourly_rate}/hr` : "";
      const status = (job.shift_status || "posted");

      list.innerHTML += `
        <article class="job-card admin-record">
          <div class="admin-record-head">
            <div>
              <h4>${job.title}</h4>
              <p class="p-muted">${job.location || "No location"} • ${job.category || "General"}</p>
              ${shiftStart ? `<p class="p-muted">Start: ${shiftStart}${shiftEnd ? " — " + shiftEnd : ""}</p>` : ""}
            </div>
            <div class="admin-record-badges">
              <span class="tag-pill bg-cyan-100 text-cyan-700">Shift</span>
<<<<<<< HEAD
              ${renderJobMonetizationBadges(job)}
=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
              ${wageLabel ? `<span class="tag-pill bg-green-100 text-green-700">${wageLabel}</span>` : ""}
              <span class="tag-pill bg-yellow-100 text-yellow-700">${status}</span>
            </div>
          </div>
<<<<<<< HEAD
          ${renderJobMonetizationMeta(job)}
          <div class="admin-record-actions">
            <button class="btn btn-outline" onclick="approveJob('${job.id}')">Approve</button>
            <button class="btn btn-outline" onclick="reboostJob('${job.id}')">Re-Boost</button>
=======
          <div class="admin-record-actions">
            <button class="btn btn-outline" onclick="approveJob('${job.id}')">Approve</button>
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
            <button class="btn btn-outline" onclick="viewJobApplications('${job.id}')">Applications</button>
            <button class="btn btn-outline" onclick="deleteJob('${job.id}')">Delete</button>
            <button class="btn btn-outline" onclick="resendShiftAlerts(${job.id}, '${job.shift_paid ? "paid" : "posted"}')">Resend Alerts</button>
          </div>
        </article>
      `;
    });

    // Insert after header
    header.after(list);
  }

  function loadShiftEscrows() {
    adminAuthFetch(`${API}/admin/shifts`)
      .then(res => res.json())
      .then(rows => {
        const container = document.getElementById("shiftEscrows");
        if (!container) return;

        if (!rows.length) {
          container.innerHTML = "<p>No shift escrows yet</p>";
          return;
        }

        container.innerHTML = "";
        rows.forEach(row => {
          const created = row.created_at ? new Date(row.created_at).toLocaleString() : "";
          const releaseAt = row.release_at ? new Date(row.release_at).toLocaleString() : "";
          const status = row.status || "";
          const amount = row.total_cents ? `$${(row.total_cents / 100).toFixed(2)}` : "";
          const reason = row.dispute_reason ? `<div class="p-muted">Reason: ${row.dispute_reason}</div>` : "";

          container.innerHTML += `
            <div class="job-card">
              <h4>${row.job_title || "Shift"}</h4>
              <p>Client: ${row.client_name || ""} • Worker: ${row.worker_name || ""}</p>
              <p>Status: <strong>${status}</strong> ${amount ? "• " + amount : ""}</p>
              <p class="p-muted">Created: ${created}${releaseAt ? " • Release at: " + releaseAt : ""}</p>
              ${reason}
              <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn btn-outline" onclick="disputeShift(${row.id})">Dispute</button>
                <button class="btn btn-outline" onclick="refundShift(${row.id})">Refund</button>
                <button class="btn btn-outline" onclick="releaseShift(${row.id})">Release</button>
                <button class="btn btn-outline" onclick="resendShiftAlerts(${row.job_id}, 'paid')">Resend alerts</button>
              </div>
            </div>
          `;
        });
      })
      .catch(err => {
        console.error("Error loading shift escrows:", err);
        const container = document.getElementById("shiftEscrows");
        if (container) {
          container.innerHTML = `<p class="empty-state" style="color: #ef4444;">Error loading escrows: ${err.message}</p>`;
        }
      });
  }

  function viewJobApplications(jobId) {
    activeApplicationsJobId = String(jobId);
    adminAuthFetch(`${API}/admin/jobs/${jobId}/applications`)
<<<<<<< HEAD
      .then(async (res) => {
        const data = await res.json().catch(() => ([]));
        if (!res.ok) {
          throw new Error(data?.message || `HTTP ${res.status} while loading applications`);
        }
        return data;
      })
      .then(apps => {
        if (jobAppsModalTitle) {
          jobAppsModalTitle.textContent = `Applications for Job #${jobId}`;
        }
        if (jobAppsModalList) {
          jobAppsModalList.innerHTML = renderApplicationsListHtml(Array.isArray(apps) ? apps : []);
        }
        openJobApplicationsModal();
      })
      .catch((err) => {
        if (jobAppsModalTitle) {
          jobAppsModalTitle.textContent = `Applications for Job #${jobId}`;
        }
        if (jobAppsModalList) {
          jobAppsModalList.innerHTML = `<p class="empty-state" style="color:#ef4444;">${esc(err.message || "Failed to load applications")}</p>`;
        }
        openJobApplicationsModal();
=======
      .then(res => res.json())
      .then(apps => {
        renderApplications(apps, `Applications for Job #${jobId}`);
        const appsContainer = document.getElementById("applications");
        if (appsContainer) {
          appsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
        }
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
      });
  }

  function renderApplications(apps, title, options = {}) {
    const containerId = options.containerId || "applications";
    const container = document.getElementById(containerId);
    if (!container) return;

<<<<<<< HEAD
    const safeApps = Array.isArray(apps) ? apps : [];
    container.innerHTML = `<h4 style="margin-bottom:10px;">${title}</h4>${renderApplicationsListHtml(safeApps)}`;
=======
    if (!apps.length) {
      container.innerHTML = "<p>No applications found</p>";
      return;
    }

    container.innerHTML = `<h4 style="margin-bottom:10px;">${title}</h4>`;
    apps.forEach(app => {
      const created = app.created_at
        ? new Date(app.created_at).toLocaleDateString()
        : "";

      const cvLink = app.cv_path
        ? `<a href="${app.cv_path}" target="_blank" class="apply-btn">CV</a>`
        : "";

      const jobTitle = app.job_title ? app.job_title : "";
      const applicantName = app.full_name || app.user_name || "";
      const applicantEmail = app.email || app.user_email || "";

      container.innerHTML += `
        <article class="job-card admin-record">
          ${jobTitle ? `<h4>${esc(jobTitle)}</h4>` : ""}
          <p>${esc(applicantName)} ${applicantEmail ? "\u2022 " + esc(applicantEmail) : ""}</p>
          <p>Status: <strong>${esc(app.status)}</strong></p>
          <p>Applied: ${created}</p>
          ${cvLink}
          <div class="admin-record-actions" style="margin-top:10px;">
            <select id="status-${app.id}" class="form-input">
              <option value="pending" ${app.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="reviewed" ${app.status === "reviewed" ? "selected" : ""}>Reviewed</option>
              <option value="accepted" ${app.status === "accepted" ? "selected" : ""}>Accepted</option>
              <option value="rejected" ${app.status === "rejected" ? "selected" : ""}>Rejected</option>
            </select>
            <button class="btn btn-outline" onclick="updateApplicationStatus(${app.id})">Update</button>
          </div>
        </article>
      `;
    });
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
  }

  function approveJob(id) {
    adminAuthFetch(`${API}/admin/jobs/${id}/approve`, {
      method: "PUT"
    }).then(() => loadJobs());
  }

  function deleteJob(id) {
    if (!confirm("Delete this job?")) return;

    adminAuthFetch(`${API}/admin/jobs/${id}`, {
      method: "DELETE"
    }).then(() => loadJobs());
  }

  function purgeTestJobs() {
    if (!confirm("This will permanently delete ALL jobs whose title contains 'test', 'demo', 'sample', or '[qa]'.\n\nProceed?")) return;

    adminAuthFetch(`${API}/admin/jobs/purge-demo`, { method: "DELETE" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { alert(data.error || "Purge failed"); return; }
        alert(data.message);
        loadJobs();
      })
      .catch((err) => alert("Purge request failed: " + err.message));
  }

<<<<<<< HEAD
  function startAdminPayment(mode, id) {
    openAdminPaymentModal().then((paymentMethod) => {
      if (!paymentMethod) return;

      adminAuthFetch(`${API}/payments/create-checkout-session`, {
        method: "POST",
        body: JSON.stringify({ mode, jobId: id, payment_method: paymentMethod })
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.url) {
          alert(data.message || "Failed to start payment");
          return;
        }
        window.location.href = data.url;
      });
=======
  function makePremium(id) {
    adminAuthFetch(`${API}/payments/create-checkout-session`, {
      method: "POST",
      body: JSON.stringify({ mode: "upgrade", jobId: id })
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok || !data.url) {
        alert(data.message || "Failed to start payment");
        return;
      }
      window.location.href = data.url;
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
    });
  }

  function makePremium(id) {
    startAdminPayment("upgrade", id);
  }

  function reboostJob(id) {
    startAdminPayment("reboost", id);
  }

  const ADMIN_PAYMENT_LABELS = {
    card: "Card",
    applepay: "Apple Pay",
    gpay: "Google Pay",
    paypal: "PayPal",
    bank_transfer: "Bank Transfer"
  };
  let adminPaymentResolver = null;

  function getAdminPaymentButtons() {
    return Array.from(document.querySelectorAll("#adminPaymentOptions .payment-method-option"));
  }

  function setAdminPaymentSelection(method, focus = false) {
    const selectedText = document.getElementById("adminPaymentSelectedText");
    getAdminPaymentButtons().forEach((btn) => {
      const selected = btn.dataset.method === method;
      btn.classList.toggle("is-selected", selected);
      btn.setAttribute("aria-selected", selected ? "true" : "false");
      btn.setAttribute("tabindex", selected ? "0" : "-1");
      if (selected && focus) btn.focus();
    });
    if (selectedText) selectedText.textContent = `Selected: ${ADMIN_PAYMENT_LABELS[method] || method}`;
  }

  function openAdminPaymentModal() {
    return new Promise((resolve) => {
      adminPaymentResolver = resolve;
      document.getElementById("adminPaymentModal")?.classList.remove("hidden");
      setAdminPaymentSelection("card");
    });
  }

  function closeAdminPaymentModal(method) {
    document.getElementById("adminPaymentModal")?.classList.add("hidden");
    if (adminPaymentResolver) {
      adminPaymentResolver(method || null);
      adminPaymentResolver = null;
    }
  }

  document.addEventListener("click", (event) => {
    const option = event.target.closest("#adminPaymentOptions .payment-method-option");
    if (option) {
      setAdminPaymentSelection(option.dataset.method, true);
      return;
    }

    if (event.target.closest("#adminPaymentConfirm")) {
      const selected = document.querySelector("#adminPaymentOptions .payment-method-option.is-selected");
      closeAdminPaymentModal(selected?.dataset.method || "card");
      return;
    }

    if (event.target.closest("#adminPaymentCancel")) {
      closeAdminPaymentModal(null);
    }
  });

  function editJob(id) {
    const job = adminJobsCache.find(item => String(item.id) === String(id));
    if (!job) return;

    editJobId = id;
    adminJobTitle.value = job.title || "";
    adminJobLocation.value = job.location || "";
    adminJobType.value = job.job_type || job.jobType || "";
    const existingCategory = (job.category || "").trim();
    if (baseJobCategories.has(existingCategory)) {
      adminJobCategory.value = existingCategory;
      if (adminJobCategoryCustom) adminJobCategoryCustom.value = "";
    } else if (existingCategory) {
      adminJobCategory.value = "Other";
      if (adminJobCategoryCustom) adminJobCategoryCustom.value = existingCategory;
    } else {
      adminJobCategory.value = "";
      if (adminJobCategoryCustom) adminJobCategoryCustom.value = "";
    }
    syncAdminCustomCategoryField();
    adminJobDescription.value = job.description || "";
    adminJobPremium.checked = !!job.is_premium;

    adminJobSubmit.textContent = "Update Job";
    adminJobCancel.style.display = "inline-flex";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetAdminJobForm() {
    editJobId = null;
    adminJobForm.reset();
    syncAdminCustomCategoryField();
    adminJobSubmit.textContent = "Add Job";
    adminJobCancel.style.display = "none";
  }

  function updateApplicationStatus(id) {
    const select = document.getElementById(`status-${id}`);
    if (!select) return;

    adminAuthFetch(`${API}/applications/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: select.value })
    }).then(() => {
      if (activeApplicationsJobId) {
        viewJobApplications(activeApplicationsJobId);
      } else {
        loadApplications();
      }
    });
  }

  function approveReview(id, source = "portal") {
    adminAuthFetch(`${API}/admin/reviews/${id}/approve?source=${encodeURIComponent(source)}`, {
      method: "PUT"
    }).then(() => loadReviewQueue(reviewStatusFilter));
<<<<<<< HEAD
  }

  function hideReview(id, source = "portal") {
    adminAuthFetch(`${API}/admin/reviews/${id}/hide?source=${encodeURIComponent(source)}`, {
      method: "PUT"
    }).then(() => loadReviewQueue(reviewStatusFilter));
  }

  function unhideReview(id, source = "portal") {
    adminAuthFetch(`${API}/admin/reviews/${id}/unhide?source=${encodeURIComponent(source)}`, {
      method: "PUT"
    }).then(() => loadReviewQueue(reviewStatusFilter));
  }

  function deleteReview(id, source = "portal") {
    if (!confirm("Delete this review permanently?")) return;

    adminAuthFetch(`${API}/admin/reviews/${id}?source=${encodeURIComponent(source)}`, {
=======
  }

  function hideReview(id) {
    adminAuthFetch(`${API}/admin/reviews/${id}/hide`, {
      method: "PUT"
    }).then(() => loadReviewQueue(reviewStatusFilter));
  }

  function unhideReview(id) {
    adminAuthFetch(`${API}/admin/reviews/${id}/unhide`, {
      method: "PUT"
    }).then(() => loadReviewQueue(reviewStatusFilter));
  }

  function deleteReview(id) {
    if (!confirm("Delete this review permanently?")) return;

    adminAuthFetch(`${API}/admin/reviews/${id}`, {
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
      method: "DELETE"
    }).then(() => loadReviewQueue(reviewStatusFilter));
  }

  function disputeShift(id) {
    const reason = prompt("Dispute reason (optional):") || "";
    const note = prompt("Internal note (optional):") || "";

    adminAuthFetch(`${API}/admin/shifts/${id}/dispute`, {
      method: "PUT",
      body: JSON.stringify({ reason, note })
    }).then(() => loadShiftEscrows());
  }

  function refundShift(id) {
    if (!confirm("Refund this shift escrow?")) return;

    adminAuthFetch(`${API}/admin/shifts/${id}/refund`, {
      method: "PUT"
    }).then(() => loadShiftEscrows());
  }

  function releaseShift(id) {
    if (!confirm("Release this shift escrow?")) return;

    adminAuthFetch(`${API}/admin/shifts/${id}/release`, {
      method: "PUT"
    }).then(() => loadShiftEscrows());
  }

  function resendShiftAlerts(jobId, status) {
    if (!confirm("Resend shift alerts to matching workers?")) return;

    adminAuthFetch(`${API}/admin/shifts/${jobId}/notify`, {
      method: "POST",
      body: JSON.stringify({ status })
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to resend alerts");
        return;
      }
      alert("Shift alerts sent ✅");
    });
  }

  if (adminJobForm) {
    adminJobCategory?.addEventListener("change", syncAdminCustomCategoryField);

    adminJobForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const resolvedCategory = resolveAdminCategoryPayload();
      if (!resolvedCategory.category) {
        alert("Please select a category");
        return;
      }
      if (resolvedCategory.category.toLowerCase() === "other" && !resolvedCategory.category_custom) {
        alert("Please enter a custom category");
        adminJobCategoryCustom?.focus();
        return;
      }

      const payload = {
        title: adminJobTitle.value.trim(),
        location: adminJobLocation.value.trim(),
        job_type: adminJobType.value.trim(),
        category: resolvedCategory.category,
        category_custom: resolvedCategory.category_custom,
        description: adminJobDescription.value.trim(),
        is_premium: adminJobPremium.checked
      };

      const url = editJobId
        ? `${API}/admin/jobs/${editJobId}`
        : `${API}/admin/jobs`;

      const method = editJobId ? "PUT" : "POST";

      adminAuthFetch(url, {
        method,
        body: JSON.stringify(payload)
      }).then(() => {
        resetAdminJobForm();
        loadJobs();
      });
    });
  }

  if (adminJobCancel) {
    adminJobCancel.addEventListener("click", resetAdminJobForm);
  }

  syncAdminCustomCategoryField();

  function loadStats() {
    adminAuthFetch(`${API}/admin/stats`)
      .then(res => res.json())
      .then(stats => {
        const totalJobs = document.getElementById("totalJobs");
        const totalApplications = document.getElementById("totalApplications");
        const premiumJobs = document.getElementById("premiumJobs");
        const normalJobs = document.getElementById("normalJobs");

        if (totalJobs) totalJobs.textContent = stats.totalJobs || 0;
        if (totalApplications) totalApplications.textContent = stats.totalApplications || 0;
        if (premiumJobs) premiumJobs.textContent = stats.premiumJobs || 0;
        if (normalJobs) normalJobs.textContent = stats.normalJobs || 0;

        drawStatsChart(stats);
      });
  }

  function drawStatsChart(stats) {
    const canvas = document.getElementById("statsChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width = canvas.clientWidth || 600;
    const height = canvas.height = canvas.clientHeight || 220;

    const jobs = stats.monthlyJobs || [];
    const apps = stats.monthlyApplications || [];

    const months = Array.from(
      new Set([...
        jobs.map(row => row.month),
        apps.map(row => row.month)
      ])
    ).sort();

    const jobMap = new Map(jobs.map(row => [row.month, row.count]));
    const appMap = new Map(apps.map(row => [row.month, row.count]));

    const values = months.map(month => ({
      month,
      jobs: jobMap.get(month) || 0,
      apps: appMap.get(month) || 0
    }));

    const maxValue = Math.max(1, ...values.map(v => Math.max(v.jobs, v.apps)));
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(248, 250, 252, 1)";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    const groupWidth = values.length ? chartWidth / values.length : chartWidth;
    const barWidth = Math.max(8, groupWidth / 3);

    values.forEach((item, index) => {
      const baseX = padding + index * groupWidth + groupWidth / 2;
      const jobsHeight = (item.jobs / maxValue) * chartHeight;
      const appsHeight = (item.apps / maxValue) * chartHeight;

      ctx.fillStyle = "#22c55e";
      ctx.fillRect(baseX - barWidth - 2, height - padding - jobsHeight, barWidth, jobsHeight);

      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(baseX + 2, height - padding - appsHeight, barWidth, appsHeight);

      ctx.fillStyle = "#475569";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(item.month, baseX, height - padding + 12);
    });

    ctx.fillStyle = "#334155";
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Jobs", padding, padding - 8);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(padding + 30, padding - 16, 10, 10);
    ctx.fillStyle = "#334155";
    ctx.fillText("Applications", padding + 50, padding - 8);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(padding + 125, padding - 16, 10, 10);
  }

  function loadModerationSettings() {
    if (!autoApproveToggle || !autoApproveMeta) return;

    adminAuthFetch(`${API}/admin/settings/auto-approval`)
      .then(res => res.json())
      .then(data => {
        autoApproveToggle.checked = !!data.enabled;
        autoApproveMeta.textContent = `Moderation provider: ${data.ai_provider || "heuristic-only"}`;
      })
      .catch((err) => {
        console.error(err);
        autoApproveMeta.textContent = "Failed to load moderation settings";
      });
  }

  function saveModerationSettings() {
    if (!autoApproveToggle) return;

    adminAuthFetch(`${API}/admin/settings/auto-approval`, {
      method: "PUT",
      body: JSON.stringify({ enabled: autoApproveToggle.checked })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error || "Failed to save moderation settings");
          return;
        }
        alert(data.message || "Moderation settings updated");
        loadModerationSettings();
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to save moderation settings");
      });
  }

  function loadCompanies() {
    adminAuthFetch(`${API}/admin/companies`)
      .then(res => res.json())
      .then(companies => {
        const container = document.getElementById("companies");
        if (!container) return;

        const list = Array.isArray(companies) ? companies : [];
        if (!list.length) {
          container.innerHTML = '<p class="empty-state">No companies registered yet.</p>';
          return;
        }

        container.innerHTML = "";
        list.forEach(company => {
          const created = company.created_at ? new Date(company.created_at).toLocaleDateString() : "";
<<<<<<< HEAD
          const companyVerificationStatus = String(company.verification_status || "pending").toLowerCase();
          const companyVerified = companyVerificationStatus === "approved";
          const hasIdProof = Boolean(String(company.id_document_url || "").trim());
          const hasBusinessProof = Boolean(String(company.business_certificate_url || "").trim());
          const hasTaxNumber = Boolean(String(company.tax_registration_number || "").trim());
          const hasProofOfAddress = Boolean(String(company.proof_of_address_url || "").trim());
          // For UK: require 3 core, proof of address is optional but shown
          const requiredProofCount = [hasIdProof, hasBusinessProof, hasTaxNumber].filter(Boolean).length;
          const hasRequiredEvidence = requiredProofCount === 3;
          // Collect missing items for tooltip
          const missingItems = [];
          if (!hasTaxNumber) missingItems.push("VAT/UTR");
          if (!hasIdProof) missingItems.push("Passport/Driving Licence");
          if (!hasBusinessProof) missingItems.push("Certificate of Incorporation/HMRC letter");
          const verifyDisabled = !companyVerified && !hasRequiredEvidence;
          const logoHtml = company.logo_url
            ? `<img src="${esc(company.logo_url)}" alt="${esc(company.name)}" style="width:40px;height:40px;object-fit:contain;border-radius:6px;margin-right:12px;">`
            : "";
          // File preview chips/icons
          function filePreviewChip(url, label) {
            if (!url) return `<span class='tag-pill bg-amber-100 text-amber-700'>${label} missing</span>`;
            const ext = url.split('.').pop().toLowerCase();
            const isImg = ["jpg","jpeg","png","gif","bmp","webp"].includes(ext);
            const isPdf = ext === "pdf";
            if (isImg) {
              return `<a href='${esc(url)}' target='_blank' rel='noopener noreferrer' title='${label}'><img src='${esc(url)}' alt='${label}' style='width:32px;height:32px;object-fit:cover;border-radius:4px;border:1px solid #ddd;vertical-align:middle;margin-right:4px;'>${label}</a>`;
            } else if (isPdf) {
              return `<a href='${esc(url)}' target='_blank' rel='noopener noreferrer' title='${label}'><span style='font-size:20px;vertical-align:middle;margin-right:4px;'>📄</span>${label}</a>`;
            } else {
              return `<a href='${esc(url)}' target='_blank' rel='noopener noreferrer' title='${label}'><span style='font-size:18px;vertical-align:middle;margin-right:4px;'>📎</span>${label}</a>`;
            }
          }
          const evidenceChecklist = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:8px;">
              <div class="tag-pill ${hasTaxNumber ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}">
                ${hasTaxNumber ? "VAT/UTR provided" : "VAT/UTR missing"}
              </div>
              <div class="tag-pill ${hasIdProof ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}">
                ${hasIdProof ? "Passport/Driving Licence provided" : "Passport/Driving Licence missing"}
              </div>
              <div class="tag-pill ${hasBusinessProof ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}">
                ${hasBusinessProof ? "Certificate of Incorporation/HMRC letter provided" : "Certificate of Incorporation/HMRC letter missing"}
              </div>
              <div class="tag-pill ${hasProofOfAddress ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}">
                ${hasProofOfAddress ? "Proof of address provided" : "Proof of address optional"}
              </div>
            </div>
          `;
          // File preview row
          const evidencePreviews = `
            <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;align-items:center;">
              ${filePreviewChip(company.id_document_url, "Passport/Driving Licence")}
              ${filePreviewChip(company.business_certificate_url, "Certificate of Incorporation/HMRC letter")}
              ${filePreviewChip(company.proof_of_address_url, "Proof of address")}
              ${company.authorization_letter_url ? filePreviewChip(company.authorization_letter_url, "Authorization letter") : `<span class='tag-pill bg-slate-100 text-slate-700'>Authorization letter optional</span>`}
            </div>
          `;
          const evidenceLinks = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:8px;">
              <div class="job-card" style="padding:8px 10px;">
                <p class="p-muted" style="margin:0 0 6px;">Passport/Driving Licence</p>
                ${hasIdProof ? `<a href="${esc(company.id_document_url)}" target="_blank" rel="noopener noreferrer">Open file</a>` : `<span class="p-muted" style="color:#b45309;">Missing</span>`}
              </div>
              <div class="job-card" style="padding:8px 10px;">
                <p class="p-muted" style="margin:0 0 6px;">Certificate of Incorporation/HMRC letter</p>
                ${hasBusinessProof ? `<a href="${esc(company.business_certificate_url)}" target="_blank" rel="noopener noreferrer">Open file</a>` : `<span class="p-muted" style="color:#b45309;">Missing</span>`}
              </div>
              <div class="job-card" style="padding:8px 10px;">
                <p class="p-muted" style="margin:0 0 6px;">Proof of address</p>
                ${hasProofOfAddress ? `<a href="${esc(company.proof_of_address_url)}" target="_blank" rel="noopener noreferrer">Open file</a>` : `<span class="p-muted">Optional</span>`}
              </div>
              <div class="job-card" style="padding:8px 10px;">
                <p class="p-muted" style="margin:0 0 6px;">Authorization letter</p>
                ${company.authorization_letter_url ? `<a href="${esc(company.authorization_letter_url)}" target="_blank" rel="noopener noreferrer">Open file</a>` : `<span class="p-muted">Optional</span>`}
              </div>
            </div>
          `;
=======
          const logoHtml = company.logo_url
            ? `<img src="${esc(company.logo_url)}" alt="${esc(company.name)}" style="width:40px;height:40px;object-fit:contain;border-radius:6px;margin-right:12px;">`
            : "";
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7

          container.innerHTML += `
            <article class="job-card admin-record">
              <div class="admin-record-head">
                <div style="display:flex;align-items:center;">
                  ${logoHtml}
                  <div>
                    <h4>${esc(company.name || "Unnamed company")}</h4>
                    <p class="p-muted">${esc(company.industry || "No industry")} \u2022 ${esc(company.location || "No location")}</p>
                    ${company.website ? `<p class="p-muted"><a href="${esc(company.website)}" target="_blank" rel="noopener noreferrer">${esc(company.website)}</a></p>` : ""}
<<<<<<< HEAD
                    ${company.owner_name || company.owner_email ? `<p class="p-muted">Owner: ${esc(company.owner_name || "Unknown")} (${esc(company.owner_email || "no-email")})</p>` : ""}
                    ${company.company_phone ? `<p class="p-muted">Company phone: ${esc(company.company_phone)}</p>` : ""}
                    ${company.company_address ? `<p class="p-muted">Address: ${esc(company.company_address)}</p>` : ""}
                    ${company.company_location ? `<p class="p-muted">Profile location: ${esc(company.company_location)}</p>` : ""}
                    ${company.tax_registration_number ? `<p class="p-muted">Tax number: ${esc(company.tax_registration_number)}</p>` : `<p class="p-muted" style="color:#b45309;">Tax number: missing</p>`}
                    ${company.linkedin_profile_url ? `<p class="p-muted">LinkedIn: <a href="${esc(company.linkedin_profile_url)}" target="_blank" rel="noopener noreferrer">${esc(company.linkedin_profile_url)}</a></p>` : ""}
                    ${created ? `<p class="p-muted">Registered: ${created}</p>` : ""}
                    <p class="p-muted" style="margin-top:8px;">Evidence readiness: ${requiredProofCount}/3 required proofs</p>
                    ${evidenceChecklist}
                    ${evidencePreviews}
                    ${evidenceLinks}
=======
                    ${created ? `<p class="p-muted">Registered: ${created}</p>` : ""}
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
                  </div>
                </div>
                <div class="admin-record-badges">
                  ${company.size ? `<span class="tag-pill bg-slate-100 text-slate-700">${company.size}</span>` : ""}
<<<<<<< HEAD
                  <span class="tag-pill ${companyVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}">
                    ${companyVerified ? "Company verified" : "Company pending"}
                  </span>
                  <span class="tag-pill ${Number(company.owner_verified) === 1 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}">
                    ${Number(company.owner_verified) === 1 ? "Employer verified" : "Pending verification"}
                  </span>
                </div>
              </div>
              <div class="admin-record-actions">
                <button class="btn btn-outline" onclick="toggleCompanyVerify(${company.id}, ${companyVerified ? 0 : 1})" ${verifyDisabled ? `disabled title='Missing: ${missingItems.join(", ")}'` : ""}>${companyVerified ? "Mark company pending" : "Verify company"}</button>
                ${company.owner_user_id ? `<button class="btn btn-outline" onclick="toggleUserVerify(${company.owner_user_id}, ${Number(company.owner_verified) === 1 ? 0 : 1})">${Number(company.owner_verified) === 1 ? "Mark unverified" : "Verify employer"}</button>` : ""}
=======
                </div>
              </div>
              <div class="admin-record-actions">
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
                <button class="btn btn-outline" onclick="deleteCompany(${company.id})">Delete</button>
              </div>
            </article>
          `;
        });
      })
      .catch(err => {
        console.error("Error loading companies:", err);
        const container = document.getElementById("companies");
        if (container) {
          container.innerHTML = `<p class="empty-state" style="color: #ef4444;">Error loading companies: ${err.message}</p>`;
        }
      });
  }

  function deleteCompany(id) {
    if (!confirm("Delete this company permanently? All associated jobs will lose their company link.")) return;

    adminAuthFetch(`${API}/admin/companies/${id}`, {
      method: "DELETE"
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to delete company");
        return;
      }
      loadCompanies();
    });
  }

<<<<<<< HEAD
  function toggleCompanyVerify(companyId, verified) {
    const actionLabel = verified ? "verify" : "mark pending";
    const notes = prompt(`Optional note for this company ${actionLabel} action:`, "") || "";

    adminAuthFetch(`${API}/admin/companies/${companyId}/verify`, {
      method: "PUT",
      body: JSON.stringify({ verified: !!verified, notes })
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to update company verification");
        return;
      }
      if (typeof toast === "function") {
        toast(data.message || "Company verification updated");
      }
      loadCompanies();
      loadUsers();
    });
  }

  function stopSupportPolling() {
    if (supportPollTimer) {
      clearInterval(supportPollTimer);
      supportPollTimer = null;
    }
  }

  function loadSupportTickets(status = supportFilter, options = {}) {
    supportFilter = status;
    if (!supportTicketsContainer) return;
    if (supportTicketsLoading) return;
    const now = Date.now();
    if (!options.force && now - lastSupportTicketsFetchAt < SUPPORT_MIN_REFRESH_MS) return;
    if (document.visibilityState !== "visible" && !options.force) return;

    supportTicketsLoading = true;
    lastSupportTicketsFetchAt = now;

    const mine = supportMineOnly ? "&mine=1" : "";
    adminAuthFetch(`${API}/chat/live-support/admin/tickets?status=${encodeURIComponent(supportFilter)}&limit=100${mine}`)
      .then(async (res) => {
        const rows = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(rows?.message || `HTTP ${res.status} while loading support tickets`);
        }
        return rows;
      })
      .then(rows => {
        const tickets = Array.isArray(rows) ? rows : [];
        const nextSignature = buildSupportTicketsSignature(tickets);

        if (supportInboxMeta) {
          const unreadTotal = tickets.reduce((sum, item) => sum + Number(item.unread_admin_count || 0), 0);
          supportInboxMeta.textContent = `${tickets.length} tickets loaded${supportMineOnly ? " • My tickets only" : ""} • ${unreadTotal} unread admin messages.`;
        }

        if (nextSignature === lastSupportTicketsSignature) {
          lastSupportTicketsError = "";
          supportConsecutiveFailures = 0;
          return;
        }

        lastSupportTicketsSignature = nextSignature;
        if (!tickets.length) {
          supportTicketsContainer.innerHTML = '<p class="empty-state">No support tickets found.</p>';
          supportConsecutiveFailures = 0;
          return;
        }

        supportTicketsContainer.innerHTML = "";
        tickets.forEach(ticket => {
          const updated = ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : "";
          const selected = String(ticket.ticket_id) === String(activeSupportTicketId);
          const statusClass = ticket.status === "closed"
            ? "bg-slate-100 text-slate-700"
            : ticket.status === "waiting_user"
              ? "bg-green-100 text-green-700"
              : ticket.status === "waiting_support"
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700";
          const unreadBadge = Number(ticket.unread_admin_count || 0) > 0
            ? `<span class="tag-pill bg-red-100 text-red-700">${esc(String(ticket.unread_admin_count))} unread</span>`
            : "";
          const assignedBadge = ticket.assigned_admin_name
            ? `<span class="tag-pill bg-indigo-100 text-indigo-700">${esc(ticket.assigned_admin_name)}</span>`
            : "<span class=\"tag-pill bg-slate-100 text-slate-700\">Unassigned</span>";
          const repliedBadge = ticket.last_replied_admin_name
            ? `<span class="tag-pill bg-emerald-100 text-emerald-700">Last reply: ${esc(ticket.last_replied_admin_name)}</span>`
            : "";

          const card = document.createElement("article");
          card.className = "job-card admin-record";
          if (selected) {
            card.style.border = "1px solid var(--primary, #2563eb)";
          }
          card.style.cursor = "pointer";
          card.innerHTML = `
            <div class="admin-record-head">
              <div>
                <h4>${esc(ticket.ticket_id)}</h4>
                <p class="p-muted">${esc(ticket.user_name || ticket.user_email_masked || "Unknown user")}</p>
                <p class="p-muted">${esc(ticket.last_message_preview || "No messages yet")}</p>
                <p class="p-muted">Updated: ${updated}</p>
              </div>
              <div class="admin-record-badges">
                ${unreadBadge}
                ${assignedBadge}
                ${repliedBadge}
                <span class="tag-pill ${statusClass}">${esc(ticket.status || "open")}</span>
              </div>
            </div>
          `;

          card.addEventListener("click", () => {
            openSupportTicket(ticket.ticket_id);
          });

          supportTicketsContainer.appendChild(card);
        });
        lastSupportTicketsError = "";
        supportConsecutiveFailures = 0;
      })
      .catch(err => {
        const errText = err?.message || "Unknown error";
        supportConsecutiveFailures += 1;

        if (errText !== lastSupportTicketsError) {
          console.error("Error loading support tickets:", err);
          lastSupportTicketsError = errText;
        }

        const nextRetryMs = Math.min(30000, 1000 * Math.pow(2, Math.min(5, supportConsecutiveFailures - 1)));
        if (supportInboxMeta) {
          supportInboxMeta.textContent = `Support inbox is temporarily unavailable. Retrying in ${Math.ceil(nextRetryMs / 1000)}s.`;
        }

        // Avoid flicker: keep last successful list visible if present.
        if (!supportTicketsContainer.children.length) {
          supportTicketsContainer.innerHTML = `<p class="empty-state" style="color:#ef4444;">Error loading support tickets: ${esc(err.message || "Failed to fetch")}</p>`;
        }

        if (supportRetryTimer) {
          clearTimeout(supportRetryTimer);
        }
        supportRetryTimer = setTimeout(() => {
          supportRetryTimer = null;
          loadSupportTickets(supportFilter, { force: true });
        }, nextRetryMs);
      })
      .finally(() => {
        supportTicketsLoading = false;
      });
  }

  function renderSupportThread(payload) {
    if (!supportThread) return;
    const ticket = payload?.ticket || {};
    const rows = Array.isArray(payload?.messages) ? payload.messages : [];
    const nextSignature = buildSupportThreadSignature(payload);

    if (nextSignature === lastSupportThreadSignature) {
      return;
    }

    lastSupportThreadSignature = nextSignature;

    supportThread.innerHTML = "";
    rows.forEach(item => {
      const sender = String(item.sender_type || "").toLowerCase();
      const bubble = document.createElement("div");
      const isUser = sender === "user";
      bubble.className = isUser ? "support-bubble user" : "support-bubble";
      if (sender === "system") {
        bubble.style.opacity = "0.8";
        bubble.style.fontSize = "12px";
        bubble.textContent = `[System] ${item.message}`;
      } else {
        const supportLabel = item.sender_name || ticket.last_replied_admin_name || "Support";
        bubble.textContent = `${isUser ? "User" : supportLabel}: ${item.message}`;
      }
      supportThread.appendChild(bubble);
    });
    supportThread.scrollTop = supportThread.scrollHeight;

    if (supportThreadTitle) {
      supportThreadTitle.textContent = `${ticket.ticket_id || activeSupportTicketId || "Ticket"} (${ticket.status || "open"})`;
    }
    if (supportThreadMeta) {
      const assigned = ticket.assigned_admin_name || "Unassigned";
      const repliedBy = ticket.last_replied_admin_name || "No admin reply yet";
      const updatedAt = formatDateTime(ticket.updated_at);
      supportThreadMeta.innerHTML = `Assigned: <span class="support-ticket-chip">${esc(assigned)}</span> <span style="margin-left:10px;">Last replied by: <span class="support-ticket-chip">${esc(repliedBy)}</span></span> <span style="margin-left:10px;">User unread: ${esc(String(ticket.unread_user_count || 0))}</span>${updatedAt ? ` <span style="margin-left:10px;">Updated: ${esc(updatedAt)}</span>` : ""}`;
    }
  }

  function loadSupportTicketMessages(options = {}) {
    if (!activeSupportTicketId || !supportThread) return;
    if (supportThreadLoading) return;
    const now = Date.now();
    if (!options.force && now - lastSupportThreadFetchAt < SUPPORT_MIN_REFRESH_MS) return;
    if (document.visibilityState !== "visible" && !options.force) return;

    supportThreadLoading = true;
    lastSupportThreadFetchAt = now;

    adminAuthFetch(`${API}/chat/live-support/${encodeURIComponent(activeSupportTicketId)}/messages`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || `HTTP ${res.status} while loading support thread`);
        }
        return data;
      })
      .then(data => {
        if (data?.message && !data?.messages) {
          throw new Error(data.message);
        }
        renderSupportThread(data);
        lastSupportThreadError = "";
      })
      .catch(err => {
        const errText = err?.message || "Unknown error";
        if (errText !== lastSupportThreadError) {
          console.error("Error loading support thread:", err);
          lastSupportThreadError = errText;
        }
        // Avoid visual jitter by only showing an error if no prior thread is visible.
        if (!supportThread.children.length) {
          supportThread.innerHTML = `<p class="empty-state" style="color:#ef4444;">${esc(err.message || "Failed to load thread")}</p>`;
        }
      })
      .finally(() => {
        supportThreadLoading = false;
      });
  }

  function openSupportTicket(ticketId) {
    activeSupportTicketId = ticketId;
    lastSupportThreadSignature = "";
    if (supportSocket) supportSocket.emit("support:join-ticket", ticketId);
    loadSupportTickets(supportFilter, { force: true });
    loadSupportTicketMessages({ force: true });
    stopSupportPolling();
    supportPollTimer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadSupportTicketMessages({ force: true });
      loadSupportTickets(supportFilter, { force: true });
    }, 8000);
  }

  function setSupportFilter(status) {
    supportMineOnly = false;
    loadSupportTickets(status);
  }

  function setSupportMineFilter() {
    supportMineOnly = !supportMineOnly;
    loadSupportTickets(supportFilter);
  }

  function closeSupportTicket() {
    if (!activeSupportTicketId) {
      alert("Select a support ticket first");
      return;
    }

    adminAuthFetch(`${API}/chat/live-support/admin/tickets/${encodeURIComponent(activeSupportTicketId)}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "closed" })
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to close ticket");
        return;
      }
      loadSupportTickets(supportFilter);
      loadSupportTicketMessages();
    });
  }

  function sendSupportReply(message) {
    if (!activeSupportTicketId) {
      alert("Select a support ticket first");
      return;
    }

    adminAuthFetch(`${API}/chat/live-support/${encodeURIComponent(activeSupportTicketId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ message })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to send reply");
        }
        loadSupportTicketMessages();
        loadSupportTickets(supportFilter);
      })
      .catch(err => {
        console.error(err);
        alert(err.message || "Failed to send reply");
      });
  }

  function assignSupportTicketToMe() {
    if (!activeSupportTicketId) {
      alert("Select a support ticket first");
      return;
    }

    adminAuthFetch(`${API}/chat/live-support/admin/tickets/${encodeURIComponent(activeSupportTicketId)}/assign`, {
      method: "PUT",
      body: JSON.stringify({ adminId: adminUser.id })
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to assign ticket");
        return;
      }
      loadSupportTickets(supportFilter);
      loadSupportTicketMessages();
    });
  }

  function setupAdminTabs() {
    const tabRoot = document.getElementById("adminSectionTabs");
    if (!tabRoot) return;

    const sectionIds = [
      "admin-jobs-section",
      "admin-applications-section",
      "admin-users-section",
      "admin-companies-section",
      "admin-grants-section",
      "admin-reviews-section",
      "admin-shifts-section",
      "admin-moderation-section",
      "admin-support-section",
      "admin-analytics-section"
    ];

    const showTarget = (targetId) => {
      const showAll = targetId === "all";
      sectionIds.forEach((id) => {
        const section = document.getElementById(id);
        if (!section) return;
        section.style.display = showAll || id === targetId ? "" : "none";
      });

      tabRoot.querySelectorAll("button[data-admin-tab]").forEach((button) => {
        const isActive = String(button.dataset.adminTab || "") === String(targetId || "");
        button.classList.toggle("btn-primary", isActive);
        button.classList.toggle("btn-outline", !isActive);
      });
    };

    tabRoot.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-admin-tab]");
      if (!button) return;
      showTarget(String(button.dataset.adminTab || "all"));
    });

    showTarget("all");
  }

=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
  window.loadJobs = loadJobs;
  window.approveJob = approveJob;
  window.deleteJob = deleteJob;
  window.makePremium = makePremium;
  window.purgeTestJobs = purgeTestJobs;
  window.toggleUserVerify = toggleUserVerify;
  window.editJob = editJob;
  window.viewJobApplications = viewJobApplications;
  window.updateApplicationStatus = updateApplicationStatus;
  window.approveReview = approveReview;
  window.hideReview = hideReview;
  window.unhideReview = unhideReview;
  window.deleteReview = deleteReview;
  window.setReviewFilter = setReviewFilter;
<<<<<<< HEAD
  window.setReviewSourceFilter = setReviewSourceFilter;
=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
  window.disputeShift = disputeShift;
  window.refundShift = refundShift;
  window.releaseShift = releaseShift;
  window.resendShiftAlerts = resendShiftAlerts;
  window.loadUsers = loadUsers;
  window.toggleUserBlock = toggleUserBlock;
  window.deleteUserAccount = deleteUserAccount;
  window.requestAdminGrant = requestAdminGrant;
  window.promoteUserToAdmin = promoteUserToAdmin;
  window.setGrantHistoryFilter = setGrantHistoryFilter;
  window.loadCompanies = loadCompanies;
<<<<<<< HEAD
  window.toggleCompanyVerify = toggleCompanyVerify;
  window.deleteCompany = deleteCompany;
  window.setSupportFilter = setSupportFilter;
  window.setSupportMineFilter = setSupportMineFilter;
  window.closeSupportTicket = closeSupportTicket;
  window.assignSupportTicketToMe = assignSupportTicketToMe;
=======
  window.deleteCompany = deleteCompany;
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7

  saveAutoApproveBtn?.addEventListener("click", saveModerationSettings);
  supportReplyForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = (supportReplyInput?.value || "").trim();
    if (!value) return;
    supportReplyInput.value = "";
    sendSupportReply(value);
  });

  supportQuickReplies?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-template]");
    if (!btn || !supportReplyInput) return;
    supportReplyInput.value = buildSupportReplyTemplate(String(btn.dataset.template || "").trim());
    supportReplyInput.focus();
  });

  jobAppsModalClose?.addEventListener("click", closeJobApplicationsModal);

  jobAppsModal?.addEventListener("click", (event) => {
    if (event.target === jobAppsModal) {
      closeJobApplicationsModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeJobApplicationsModal();
    }
  });

  loadJobs();
  loadApplications();
  updateReviewSourceButtons();
  loadReviewQueue();
  loadShiftEscrows();
  loadUsers();
  loadGrantHistory();
  loadCompanies();
<<<<<<< HEAD
  loadSupportTickets();
  connectSupportRealtime();
=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
  loadStats();
  loadModerationSettings();
  setupAdminTabs();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      scheduleSupportRefresh();
    }
  });

  window.addEventListener("beforeunload", () => {
    stopSupportPolling();
    if (supportRetryTimer) {
      clearTimeout(supportRetryTimer);
      supportRetryTimer = null;
    }
  });

  // Export all onclick handler functions to global scope
  window.editJob = editJob;
  window.approveJob = approveJob;
  window.makePremium = makePremium;
  window.reboostJob = reboostJob;
  window.viewJobApplications = viewJobApplications;
  window.deleteJob = deleteJob;
  window.updateApplicationStatus = updateApplicationStatus;
  window.toggleUserBlock = toggleUserBlock;
  window.toggleUserVerify = toggleUserVerify;
  window.deleteUserAccount = deleteUserAccount;
  window.deleteReview = deleteReview;
  window.approveReview = approveReview;
  window.hideReview = hideReview;
  window.unhideReview = unhideReview;
})();