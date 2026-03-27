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
  const shiftPaymentModal = document.getElementById("shiftPaymentModal");
  const shiftPaymentOptions = document.getElementById("shiftPaymentOptions");
  const shiftPaymentSelectedText = document.getElementById("shiftPaymentSelectedText");
  const shiftPaymentConfirmBtn = document.getElementById("shiftPaymentConfirm");
  const shiftPaymentCancelBtn = document.getElementById("shiftPaymentCancel");
  const shiftPaymentCloseBtn = document.getElementById("shiftPaymentClose");

  const stages = ["new", "screening", "interview", "offer", "hired", "rejected"];
  const shiftPaymentMethods = ["card", "applepay", "gpay", "paypal", "bank_transfer"];
  let applications = [];
  let activeApplicationId = null;
  let shiftPaymentResolver = null;
  let selectedShiftPaymentMethod = "card";

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

  const getShiftPaymentButtons = () => {
    return Array.from(shiftPaymentOptions?.querySelectorAll(".payment-method-option") || []);
  };

  const getShiftPaymentLabel = (method) => {
    const labels = {
      card: "Card",
      applepay: "Apple Pay",
      gpay: "Google Pay",
      paypal: "PayPal",
      bank_transfer: "Bank Transfer"
    };
    return labels[method] || "Card";
  };

  const setShiftPaymentSelection = (method, { focus = false } = {}) => {
    const targetMethod = shiftPaymentMethods.includes(method) ? method : "card";
    const previousMethod = selectedShiftPaymentMethod;
    selectedShiftPaymentMethod = targetMethod;

    getShiftPaymentButtons().forEach((option) => {
      const isSelected = option.getAttribute("data-method") === targetMethod;
      option.classList.toggle("is-selected", isSelected);
      if (isSelected && previousMethod !== targetMethod) {
        option.classList.remove("selection-animate");
        void option.offsetWidth;
        option.classList.add("selection-animate");
      } else if (!isSelected) {
        option.classList.remove("selection-animate");
      }
      option.setAttribute("aria-selected", isSelected ? "true" : "false");
      option.setAttribute("tabindex", isSelected ? "0" : "-1");
      if (isSelected && focus) option.focus();
    });

    if (shiftPaymentSelectedText) {
      shiftPaymentSelectedText.textContent = `Selected: ${getShiftPaymentLabel(targetMethod)}`;
    }
  };

  const resolveShiftPaymentMethod = (method) => {
    if (!shiftPaymentResolver) return;
    const resolver = shiftPaymentResolver;
    shiftPaymentResolver = null;
    shiftPaymentModal?.classList.add("hidden");
    resolver(method);
  };

  const openShiftPaymentModal = () => {
    setShiftPaymentSelection("card", { focus: true });
    shiftPaymentModal?.classList.remove("hidden");
  };

  const requestShiftPaymentMethod = () => {
    return new Promise((resolve) => {
      shiftPaymentResolver = resolve;
      openShiftPaymentModal();
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

  shiftPaymentConfirmBtn?.addEventListener("click", () => {
    const method = shiftPaymentMethods.includes(selectedShiftPaymentMethod)
      ? selectedShiftPaymentMethod
      : "card";
    resolveShiftPaymentMethod(method);
  });

  shiftPaymentOptions?.addEventListener("click", (event) => {
    const button = event.target.closest(".payment-method-option");
    if (!button) return;

    const method = String(button.getAttribute("data-method") || "").toLowerCase();
    if (!shiftPaymentMethods.includes(method)) return;

    setShiftPaymentSelection(method);
  });

  shiftPaymentOptions?.addEventListener("keydown", (event) => {
    const options = getShiftPaymentButtons();
    if (!options.length) return;

    const currentIndex = options.findIndex((option) => option.classList.contains("is-selected"));
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    let nextIndex = safeIndex;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      nextIndex = (safeIndex + 1) % options.length;
      setShiftPaymentSelection(options[nextIndex].getAttribute("data-method"), { focus: true });
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      nextIndex = (safeIndex - 1 + options.length) % options.length;
      setShiftPaymentSelection(options[nextIndex].getAttribute("data-method"), { focus: true });
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setShiftPaymentSelection(options[0].getAttribute("data-method"), { focus: true });
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setShiftPaymentSelection(options[options.length - 1].getAttribute("data-method"), { focus: true });
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      const activeElement = document.activeElement;
      const focusedMethod = activeElement?.getAttribute?.("data-method");
      if (focusedMethod) {
        setShiftPaymentSelection(focusedMethod, { focus: true });
      }
    }
  });

  const cancelShiftPaymentSelection = () => resolveShiftPaymentMethod(null);

  shiftPaymentCancelBtn?.addEventListener("click", cancelShiftPaymentSelection);
  shiftPaymentCloseBtn?.addEventListener("click", cancelShiftPaymentSelection);

  shiftPaymentModal?.addEventListener("click", (event) => {
    if (event.target?.id === "shiftPaymentModal") {
      cancelShiftPaymentSelection();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && shiftPaymentModal && !shiftPaymentModal.classList.contains("hidden")) {
      cancelShiftPaymentSelection();
    }
  });

  document.querySelector(".pipeline-board")?.addEventListener("click", async (event) => {
    const action = event.target.getAttribute("data-action");
    const appId = event.target.getAttribute("data-id");
    const jobId = event.target.getAttribute("data-job-id");
    if (!action) return;

    if (action === "accept-shift") {
      if (!appId) return;
      const paymentMethod = await requestShiftPaymentMethod();
      if (!paymentMethod) return;
      try {
        const res = await safeAuthFetch(`${API}/shifts/applications/${appId}/accept`, {
          method: "POST",
          body: JSON.stringify({ payment_method: paymentMethod })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || "Failed to accept shift");
          return;
        }
        const methodLabel = data.payment_method ? `\nPayment method: ${data.payment_method}` : "";
        alert((data.message || "Shift accepted") + methodLabel);
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
