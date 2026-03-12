document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Login required");
    window.location.href = "login.html";
    return;
  }

  const rawUser = localStorage.getItem("user");
  let user = {};
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) || {};
    } catch (err) {
      console.error("Invalid JSON in localStorage.user", err);
      localStorage.removeItem("user");
      user = {};
    }
  }

  // Only employers and admins can access this page
  if (!user.is_admin && user.role !== "employer") {
    alert("This page is for employers only.");
    window.location.href = "dashboard.html";
    return;
  }
  const jobSelect = document.getElementById("jobSelect");
  const refreshJobs = document.getElementById("refreshJobs");
  const refreshMessages = document.getElementById("refreshMessages");
  const messageMeta = document.getElementById("messageMeta");
  const messageList = document.getElementById("messageList");
  const messageForm = document.getElementById("messageForm");
  const messageInput = document.getElementById("messageInput");
  const candidateProfile = document.getElementById("candidateProfile");
  const statJobs = document.getElementById("employerTotalJobs");
  const statApplications = document.getElementById("employerTotalApplications");
  const statSaves = document.getElementById("employerTotalSaves");
  const pipelineSummary = document.getElementById("pipelineSummary");

  const stages = ["new", "screening", "interview", "offer", "hired", "rejected"];
  let applications = [];
  let activeApplicationId = null;

  const safeAuthFetch = window.authFetch
    ? window.authFetch
    : (url, options = {}) => {
        return fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        });
      };

  const clearPipeline = () => {
    stages.forEach(stage => {
      const column = document.getElementById(`stage-${stage}`);
      if (column) column.innerHTML = "";
    });
  };

  const renderPipeline = () => {
    clearPipeline();

    applications.forEach(app => {
      const stage = (app.pipeline_stage || "new").toLowerCase();
      const column = document.getElementById(`stage-${stage}`) || document.getElementById("stage-new");
      if (!column) return;

      const created = app.created_at ? new Date(app.created_at).toLocaleDateString() : "";
      const candidate = app.full_name || app.user_name || "Candidate";
      const email = app.email || app.user_email || "";
      const cvLink = app.cv_path
        ? `<a href="${app.cv_path}" class="btn btn-outline" target="_blank">CV</a>`
        : "";

      const shiftBadge = () => {
        if (!app.is_shift) return "";
        const status = (app.escrow_status || app.shift_status || "open").toLowerCase();
        const label = status.replace(/_/g, " ");
        return `<span class="status-pill status-${status}">${label}</span>`;
      };

      const shiftMeta = () => {
        if (!app.is_shift) return "";
        const pay = app.shift_pay_cents ? `$${(app.shift_pay_cents / 100).toFixed(2)}` : "";
        const start = app.shift_start ? new Date(app.shift_start).toLocaleString() : "";
        const end = app.shift_end ? new Date(app.shift_end).toLocaleString() : "";
        const time = start && end ? `${start} - ${end}` : start || end;
        const parts = [pay, time].filter(Boolean).join(" • ");
        return parts ? `<div class="p-muted">${parts}</div>` : "";
      };

      const shiftActions = () => {
        if (!app.is_shift) return "";
        const canAccept = !app.escrow_id && (app.shift_status || "open") === "open";
        const canConfirm = app.escrow_id && app.escrow_status === "awaiting_confirmation" && !app.client_confirmed;
        const actions = [];

        if (canAccept) {
          actions.push(`<button class="btn btn-outline" type="button" data-action="accept-shift" data-id="${app.id}">Accept shift</button>`);
        }

        if (canConfirm) {
          actions.push(`<button class="btn btn-outline" type="button" data-action="client-confirm" data-job-id="${app.job_id}">Confirm completion</button>`);
        }

        return actions.length ? `<div class="shift-actions">${actions.join("")}</div>` : "";
      };

      const stageOptions = stages
        .map(stageName => {
          const selected = stageName === stage ? "selected" : "";
          const label = stageName.charAt(0).toUpperCase() + stageName.slice(1);
          return `<option value="${stageName}" ${selected}>${label}</option>`;
        })
        .join("");

      column.innerHTML += `
        <article class="pipeline-card">
          <div class="pipeline-card__header">
            <div>
              <h4>${esc(candidate)}</h4>
              <p class="meta">${esc(email)}</p>
            </div>
            <div class="status-stack">
              <span class="status-pill status-${stage}">${esc(stage)}</span>
              ${shiftBadge()}
            </div>
          </div>
          <p class="p-muted">Applied: ${created}</p>
          ${shiftMeta()}
          ${cvLink}
          ${shiftActions()}
          <div class="pipeline-actions">
            <select class="form-input" data-stage-select="${app.id}">
              ${stageOptions}
            </select>
            <button class="btn btn-outline" type="button" data-action="move" data-id="${app.id}">Update</button>
            <button class="btn btn-outline" type="button" data-action="message" data-id="${app.id}">Message</button>
            <button class="btn btn-outline" type="button" data-action="profile" data-id="${app.id}">View profile</button>
          </div>
        </article>
      `;
    });
  };

  const renderCandidateProfile = (app) => {
    if (!candidateProfile) return;
    if (!app) {
      candidateProfile.innerHTML = '<p class="p-muted">Select a candidate to view profile.</p>';
      return;
    }

    const candidate = app.full_name || app.user_name || "Candidate";
    const email = app.email || app.user_email || "";
    const created = app.created_at ? new Date(app.created_at).toLocaleDateString() : "";
    const resume = app.cv_path
      ? `<a class="profile-link" href="${app.cv_path}" target="_blank">Resume</a>`
      : "<span class=\"p-muted\">No resume</span>";
    const shift = app.is_shift
      ? `<span class="pill">Shift</span>`
      : "";

    candidateProfile.innerHTML = `
      <div class="candidate-head">
        <div class="profile-avatar">${esc(candidate.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "?")}</div>
        <div>
          <h4>${esc(candidate)}</h4>
          <p class="p-muted">${esc(email)}</p>
        </div>
      </div>
      <div class="candidate-meta">
        <span class="p-muted">Applied: ${created}</span>
        ${shift}
      </div>
      <div class="candidate-actions">
        ${resume}
      </div>
    `;
  };

  const loadJobs = async () => {
    try {
      const res = await safeAuthFetch(`${API}/employer/jobs`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to load jobs");
        return;
      }

      jobSelect.innerHTML = "";
      if (!data.length) {
        jobSelect.innerHTML = '<option value="">No jobs found</option>';
        clearPipeline();
        return;
      }

      data.forEach(job => {
        const option = document.createElement("option");
        option.value = job.id;
        option.textContent = `${job.title} (${job.location || ""})`;
        jobSelect.appendChild(option);
      });

      await loadApplications();
    } catch (err) {
      console.error(err);
      alert("Failed to load jobs");
    }
  };

  const loadApplications = async () => {
    const jobId = jobSelect.value;
    if (!jobId) {
      clearPipeline();
      return;
    }

    try {
      const res = await safeAuthFetch(`${API}/employer/applications?jobId=${jobId}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to load applications");
        return;
      }

      applications = data || [];
      renderPipeline();
    } catch (err) {
      console.error(err);
      alert("Failed to load applications");
    }
  };

  const loadMessages = async (applicationId) => {
    if (!applicationId) return;

    try {
      const res = await safeAuthFetch(`${API}/messages/applications/${applicationId}/messages`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to load messages");
        return;
      }

      messageList.innerHTML = "";
      if (!data.length) {
        messageList.innerHTML = '<p class="p-muted">No messages yet.</p>';
        return;
      }

      data.forEach(msg => {
        const isMe = user && msg.sender_id === user.id;
        const bubbleClass = isMe ? "message-bubble me" : "message-bubble";
        const label = isMe ? "You" : "Candidate";
        const time = msg.created_at ? new Date(msg.created_at).toLocaleString() : "";

        messageList.innerHTML += `
          <div class="${bubbleClass}">
            <div class="message-meta">${esc(label)} • ${esc(time)}</div>
            <div>${esc(msg.message)}</div>
          </div>
        `;
      });
    } catch (err) {
      console.error(err);
      alert("Failed to load messages");
    }
  };

  const renderPipelineSummary = (data) => {
    if (!pipelineSummary) return;
    const total = data.reduce((sum, row) => sum + row.count, 0) || 1;

    const rows = stages.map((stage) => {
      const match = data.find((row) => row.stage === stage);
      const count = match ? match.count : 0;
      const percent = Math.round((count / total) * 100);
      const label = stage.charAt(0).toUpperCase() + stage.slice(1);

      return `
        <div class="pipeline-bar">
          <span class="pipeline-bar__label">${label}</span>
          <div class="pipeline-bar__track">
            <div class="pipeline-bar__fill" style="width:${percent}%"></div>
          </div>
          <span class="pipeline-bar__count">${count}</span>
        </div>
      `;
    });

    pipelineSummary.innerHTML = rows.join("");
  };

  const loadStats = async () => {
    try {
      const res = await safeAuthFetch(`${API}/employer/stats`);
      const data = await res.json();
      if (!res.ok) {
        console.warn(data.message || "Failed to load employer stats");
        return;
      }

      if (statJobs) statJobs.textContent = data.totalJobs || 0;
      if (statApplications) statApplications.textContent = data.totalApplications || 0;
      if (statSaves) statSaves.textContent = data.totalSaves || 0;
      renderPipelineSummary(data.pipeline || []);
    } catch (err) {
      console.error(err);
    }
  };

  jobSelect?.addEventListener("change", async () => {
    await loadApplications();
    activeApplicationId = null;
    if (messageMeta) messageMeta.textContent = "Select an application to view messages.";
    if (messageList) messageList.innerHTML = "";
    renderCandidateProfile(null);
  });

  refreshJobs?.addEventListener("click", async () => {
    await loadJobs();
    await loadStats();
  });
  refreshMessages?.addEventListener("click", () => loadMessages(activeApplicationId));

  document.querySelector(".pipeline-board")?.addEventListener("click", async (event) => {
    const action = event.target.getAttribute("data-action");
    const appId = event.target.getAttribute("data-id");
    const jobId = event.target.getAttribute("data-job-id");
    if (!action) return;

    if (action === "accept-shift") {
      if (!appId) return;
      try {
        const res = await safeAuthFetch(`${API}/shifts/applications/${appId}/accept`, {
          method: "POST"
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || "Failed to accept shift");
          return;
        }
        alert(data.message || "Shift accepted");
        await loadApplications();
        return;
      } catch (err) {
        console.error(err);
        alert("Failed to accept shift");
        return;
      }
    }

    if (action === "client-confirm") {
      if (!jobId) return;
      try {
        const res = await safeAuthFetch(`${API}/shifts/${jobId}/client-confirm`, {
          method: "POST"
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || "Failed to confirm shift");
          return;
        }
        alert(data.message || "Shift confirmed");
        await loadApplications();
        return;
      } catch (err) {
        console.error(err);
        alert("Failed to confirm shift");
        return;
      }
    }

    if (action === "message") {
      if (!appId) return;
      activeApplicationId = Number(appId);
      const app = applications.find(item => String(item.id) === String(appId));
      const candidate = app?.full_name || app?.user_name || "Candidate";
      if (messageMeta) messageMeta.textContent = `Chat with ${candidate}`;
      renderCandidateProfile(app);
      await loadMessages(activeApplicationId);
      return;
    }

    if (action === "profile") {
      if (!appId) return;
      const app = applications.find(item => String(item.id) === String(appId));
      renderCandidateProfile(app);
      return;
    }

    if (action === "move") {
      if (!appId) return;
      const select = document.querySelector(`[data-stage-select="${appId}"]`);
      if (!select) return;

      try {
        const res = await safeAuthFetch(`${API}/employer/applications/${appId}/pipeline`, {
          method: "PUT",
          body: JSON.stringify({ pipeline_stage: select.value })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || "Failed to update stage");
          return;
        }
        await loadApplications();
      } catch (err) {
        console.error(err);
        alert("Failed to update stage");
      }
    }
  });

  messageForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!activeApplicationId) {
      alert("Select an application first");
      return;
    }

    const message = (messageInput.value || "").trim();
    if (!message) return;

    try {
      const res = await safeAuthFetch(`${API}/messages/applications/${activeApplicationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to send message");
        return;
      }
      messageInput.value = "";
      await loadMessages(activeApplicationId);
    } catch (err) {
      console.error(err);
      alert("Failed to send message");
    }
  });

  await loadJobs();
  await loadStats();
});
