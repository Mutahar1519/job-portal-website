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
  const renewJobBtn = document.getElementById("renewJobBtn");
  const reboostJobBtn = document.getElementById("reboostJobBtn");
  const selectedJobMeta = document.getElementById("selectedJobMeta");
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
  const bulkCsvFile = document.getElementById("bulkCsvFile");
  const bulkCsvMeta = document.getElementById("bulkCsvMeta");
  const bulkDryRunBtn = document.getElementById("bulkDryRunBtn");
  const bulkUploadBtn = document.getElementById("bulkUploadBtn");
  const bulkUploadResult = document.getElementById("bulkUploadResult");
  const bulkUploadIssues = document.getElementById("bulkUploadIssues");
  const downloadBulkTemplateBtn = document.getElementById("downloadBulkTemplateBtn");

  const stages = ["new", "screening", "interview", "offer", "hired", "rejected"];
  const interviewStatuses = ["not_started", "scheduled", "completed", "offered", "rejected"];
  const formatInterviewStatus = (value) => String(value || "not_started").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let applications = [];
  let activeApplicationId = null;
  let employerJobsById = new Map();
  let parsedBulkRows = [];

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

  const splitCsvLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current);
    return values.map((v) => v.trim());
  };

  const parseBulkCsv = (csvText) => {
    const lines = String(csvText || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cols = splitCsvLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ?? "";
      });
      rows.push(row);
    }

    return rows;
  };

  const renderBulkIssues = (issues) => {
    if (!bulkUploadIssues) return;
    if (!issues || !issues.length) {
      bulkUploadIssues.innerHTML = "";
      return;
    }

    bulkUploadIssues.innerHTML = issues
      .slice(0, 40)
      .map((issue) => {
        const line = issue.row || "?";
        const errors = Array.isArray(issue.errors)
          ? issue.errors.join(" | ")
          : (issue.error || "Unknown error");
        return `<div class=\"job-card\"><strong>Row ${line}</strong><p class=\"p-muted\">${esc(errors)}</p></div>`;
      })
      .join("");
  };

  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get("payment");
  const sessionId = params.get("session_id");
  const mode = params.get("mode");
  const paidJobId = params.get("jobId");

  if (paymentStatus === "success" && mode === "reboost" && sessionId && paidJobId) {
    try {
      const confirmRes = await safeAuthFetch(`${API}/payments/confirm`, {
        method: "POST",
        body: JSON.stringify({ sessionId, mode: "reboost", jobId: paidJobId })
      });
      const confirmData = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok) {
        alert(confirmData.message || "Payment confirmation failed");
      } else {
        alert("Job re-boosted successfully ✅");
      }
    } catch (err) {
      alert("Payment confirmation failed");
    }
    window.history.replaceState({}, document.title, "employer.html");
  }

  const renderSelectedJobMeta = () => {
    if (!selectedJobMeta) return;
    const jobId = jobSelect?.value;
    if (!jobId) {
      selectedJobMeta.textContent = "";
      return;
    }

    const job = employerJobsById.get(String(jobId));
    if (!job) {
      selectedJobMeta.textContent = "";
      return;
    }

    const bits = [];
    bits.push(job.is_premium ? "Premium active" : "Standard listing");
    if (Number(job.reboost_count || 0) > 0) bits.push(`Re-boosted ${Number(job.reboost_count)}x`);
    if (job.repost_of_job_id) bits.push(`Repost of #${job.repost_of_job_id}`);
    if (job.expires_at) {
      const expDate = new Date(job.expires_at);
      if (!Number.isNaN(expDate.getTime())) {
        bits.push(`Expires ${expDate.toLocaleDateString()}`);
      }
    }
    if (Number(job.renewal_count || 0) > 0) bits.push(`Renewed ${Number(job.renewal_count)}x`);
    selectedJobMeta.textContent = bits.join(" | ");
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

      const interviewOptions = interviewStatuses
        .map((statusValue) => {
          const selected = String(app.interview_status || "not_started") === statusValue ? "selected" : "";
          return `<option value="${statusValue}" ${selected}>${formatInterviewStatus(statusValue)}</option>`;
        })
        .join("");

      const scoreLabel = app.score == null ? "Not scored" : `Score ${Number(app.score)}/100`;
      const interviewLabel = formatInterviewStatus(app.interview_status || "not_started");

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
          <div class="pipeline-eval-summary">
            <span class="status-pill status-screening">${esc(scoreLabel)}</span>
            <span class="status-pill status-new">${esc(interviewLabel)}</span>
          </div>
          ${cvLink}
          ${shiftActions()}
          <div class="pipeline-eval-controls">
            <input class="form-input" type="number" min="0" max="100" step="1" data-score-input="${app.id}" value="${app.score == null ? "" : Number(app.score)}" placeholder="Score 0-100">
            <select class="form-input" data-interview-status-input="${app.id}">${interviewOptions}</select>
            <textarea class="form-input" rows="2" data-interview-notes-input="${app.id}" placeholder="Interview notes (optional)">${esc(app.interview_notes || "")}</textarea>
          </div>
          <div class="pipeline-actions">
            <select class="form-input" data-stage-select="${app.id}">
              ${stageOptions}
            </select>
            <button class="btn btn-primary" type="button" data-action="save-eval" data-id="${app.id}">Save evaluation</button>
            <button class="btn btn-outline" type="button" data-action="schedule-interview" data-id="${app.id}">Schedule interview</button>
            <button class="btn btn-outline" type="button" data-action="background-check" data-id="${app.id}">Background check</button>
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
    const evalScore = app.score == null ? "Not scored" : `${Number(app.score)}/100`;
    const interviewStatus = formatInterviewStatus(app.interview_status || "not_started");
    const notes = app.interview_notes ? `<p class="p-muted" style="margin-top:8px;">${esc(app.interview_notes)}</p>` : "";

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
      <div class="candidate-meta">
        <span class="p-muted">Score: ${esc(evalScore)}</span>
        <span class="p-muted">Interview: ${esc(interviewStatus)}</span>
      </div>
      ${notes}
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

      employerJobsById = new Map((data || []).map((job) => [String(job.id), job]));
      renderSelectedJobMeta();

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
    renderSelectedJobMeta();
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

  bulkCsvFile?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      parsedBulkRows = [];
      if (bulkCsvMeta) bulkCsvMeta.textContent = "No file selected";
      return;
    }

    if (bulkCsvMeta) bulkCsvMeta.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;

    try {
      const csvText = await file.text();
      parsedBulkRows = parseBulkCsv(csvText);
      if (bulkUploadResult) {
        bulkUploadResult.textContent = parsedBulkRows.length
          ? `Loaded ${parsedBulkRows.length} rows. Run Dry Run to validate.`
          : "No data rows found in CSV file.";
      }
      renderBulkIssues([]);
    } catch (err) {
      parsedBulkRows = [];
      if (bulkUploadResult) bulkUploadResult.textContent = "Failed to parse CSV file.";
    }
  });

  downloadBulkTemplateBtn?.addEventListener("click", () => {
    const template = [
      "title,location,job_type,category,description,salary_min,salary_max,experience_level,is_remote,benefits,application_deadline",
      'Frontend Developer,Remote,Full-time,IT,"Build and maintain modern web interfaces using React and TypeScript.",50000,70000,Mid-level,true,"Health insurance;Remote stipend",2026-06-30',
      'Product Designer,London,Contract,Design,"Design wireframes and UI systems across product flows.",45000,65000,Senior,false,"Flexible hours",2026-07-15'
    ].join("\n");

    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobportal-bulk-template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const runBulkUpload = async (dryRun) => {
    if (!parsedBulkRows.length) {
      alert("Please choose a CSV file first.");
      return;
    }

    try {
      const res = await safeAuthFetch(`${API}/employer/jobs/bulk-upload`, {
        method: "POST",
        body: JSON.stringify({ jobs: parsedBulkRows, dry_run: dryRun })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (bulkUploadResult) bulkUploadResult.textContent = data.message || "Bulk upload failed.";
        renderBulkIssues(data.invalid_rows || data.create_errors || []);
        return;
      }

      if (dryRun) {
        if (bulkUploadResult) {
          bulkUploadResult.textContent = `Dry run complete: ${data.valid_rows}/${data.total_rows} valid rows.`;
        }
        renderBulkIssues(data.invalid_rows || []);
        return;
      }

      if (bulkUploadResult) {
        bulkUploadResult.textContent = `Created ${data.created_count} jobs out of ${data.total_rows} rows.`;
      }
      renderBulkIssues([...(data.skipped_invalid_rows || []), ...(data.create_errors || [])]);
      await loadJobs();
      await loadStats();
    } catch (err) {
      console.error(err);
      if (bulkUploadResult) bulkUploadResult.textContent = "Bulk upload failed due to server error.";
    }
  };

  bulkDryRunBtn?.addEventListener("click", () => runBulkUpload(true));
  bulkUploadBtn?.addEventListener("click", () => runBulkUpload(false));

  renewJobBtn?.addEventListener("click", async () => {
    const selectedJobId = jobSelect?.value;
    if (!selectedJobId) {
      alert("Select a job first");
      return;
    }

    if (!confirm("Renew this job for 30 more days?")) return;

    try {
      const res = await safeAuthFetch(`${API}/employer/jobs/${selectedJobId}/renew`, {
        method: "PUT"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "Failed to renew job");
        return;
      }

      alert(data.message || "Job renewed");
      await loadJobs();
    } catch (err) {
      console.error(err);
      alert("Failed to renew job");
    }
  });

  reboostJobBtn?.addEventListener("click", async () => {
    const selectedJobId = jobSelect?.value;
    if (!selectedJobId) {
      alert("Select a job first");
      return;
    }

    if (!confirm("Re-Boost this job with premium payment?")) return;

    try {
      const checkoutRes = await safeAuthFetch(`${API}/payments/create-checkout-session`, {
        method: "POST",
        body: JSON.stringify({ mode: "reboost", jobId: selectedJobId, payment_method: "card" })
      });
      const checkoutData = await checkoutRes.json().catch(() => ({}));
      if (!checkoutRes.ok || !checkoutData.url) {
        alert(checkoutData.message || "Failed to start payment");
        return;
      }
      window.location.href = checkoutData.url;
    } catch (err) {
      console.error(err);
      alert("Failed to start payment");
    }
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
        const paymentMethod = await resolveShiftPaymentMethod();
        if (!paymentMethod) {
          return;
        }

        const res = await safeAuthFetch(`${API}/shifts/applications/${appId}/accept`, {
          method: "POST",
          body: JSON.stringify({ payment_method: paymentMethod })
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
      if (app?.user_id) {
        window.open(`profile.html?userId=${app.user_id}`, "_blank");
      }
      renderCandidateProfile(app);
      return;
    }

    if (action === "schedule-interview") {
      if (!appId) return;
      const app = applications.find(item => String(item.id) === String(appId));
      const candidate = app?.full_name || app?.user_name || "Candidate";

      const whenRaw = prompt(`Schedule interview with ${candidate}.\nEnter date and time (YYYY-MM-DD HH:mm):`);
      if (!whenRaw) return;
      const normalizedWhen = whenRaw.trim().replace(" ", "T");

      const meetingTypeInput = prompt("Meeting type: video, phone, or onsite", "video");
      if (!meetingTypeInput) return;
      const meetingType = meetingTypeInput.trim().toLowerCase();

      const meetingLink = prompt("Meeting link or location (optional)", "") || "";
      const notes = prompt("Interview notes (optional)", "") || "";

      try {
        const res = await safeAuthFetch(`${API}/employer/applications/${appId}/interviews`, {
          method: "POST",
          body: JSON.stringify({
            scheduled_at: normalizedWhen,
            meeting_type: meetingType,
            meeting_link: meetingLink,
            notes,
            duration_minutes: 30
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.message || "Failed to schedule interview");
          return;
        }
        alert(`Interview scheduled for ${candidate}`);
        await loadApplications();
      } catch (err) {
        console.error(err);
        alert("Failed to schedule interview");
      }
      return;
    }

    if (action === "background-check") {
      if (!appId) return;
      const provider = prompt("Background check provider", "internal") || "internal";
      const packageName = prompt("Package name", "standard") || "standard";
      const notes = prompt("Background check notes (optional)", "") || "";

      try {
        const res = await safeAuthFetch(`${API}/employer/applications/${appId}/background-check`, {
          method: "POST",
          body: JSON.stringify({
            provider,
            package_name: packageName,
            notes
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.message || "Failed to order background check");
          return;
        }
        alert(`Background check ordered. Ref: ${data.reference_code || "N/A"}`);
      } catch (err) {
        console.error(err);
        alert("Failed to order background check");
      }
      return;
    }

    if (action === "save-eval") {
      if (!appId) return;
      const scoreInput = document.querySelector(`[data-score-input="${appId}"]`);
      const statusInput = document.querySelector(`[data-interview-status-input="${appId}"]`);
      const notesInput = document.querySelector(`[data-interview-notes-input="${appId}"]`);

      const scoreValue = (scoreInput?.value || "").trim();
      const payload = {
        score: scoreValue === "" ? null : Number(scoreValue),
        interview_status: (statusInput?.value || "not_started").trim(),
        interview_notes: (notesInput?.value || "").trim()
      };

      try {
        const res = await safeAuthFetch(`${API}/employer/applications/${appId}/evaluation`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || "Failed to save evaluation");
          return;
        }
        await loadApplications();
      } catch (err) {
        console.error(err);
        alert("Failed to save evaluation");
      }
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

/* ============================================================
   SHIFT PAYMENT MODAL
   ============================================================ */

const SHIFT_PAYMENT_LABELS = {
  card: "Card",
  applepay: "Apple Pay",
  gpay: "Google Pay",
  paypal: "PayPal",
  bank_transfer: "Bank Transfer",
};

function getShiftPaymentButtons() {
  return Array.from(document.querySelectorAll("#shiftPaymentOptions .payment-method-option"));
}

function getShiftPaymentLabel(method) {
  return SHIFT_PAYMENT_LABELS[method] || method;
}

function setShiftPaymentSelection(method, { focus = false } = {}) {
  const buttons = getShiftPaymentButtons();
  const selectedText = document.getElementById("shiftPaymentSelectedText");
  buttons.forEach((btn) => {
    const isSelected = btn.dataset.method === method;
    btn.classList.toggle("is-selected", isSelected);
    btn.setAttribute("aria-selected", isSelected ? "true" : "false");
    btn.setAttribute("tabindex", isSelected ? "0" : "-1");
    if (isSelected) {
      // Restart pulse animation
      btn.classList.remove("selection-animate");
      void btn.offsetWidth; // force reflow
      btn.classList.add("selection-animate");
      if (focus) btn.focus();
    }
  });
  if (selectedText) {
    selectedText.textContent = "Selected: " + getShiftPaymentLabel(method);
  }
}

let _shiftPaymentResolve = null;

function openShiftPaymentModal() {
  return new Promise((resolve) => {
    _shiftPaymentResolve = resolve;
    const modal = document.getElementById("shiftPaymentModal");
    if (!modal) { resolve("card"); return; }
    modal.classList.remove("hidden");
    setShiftPaymentSelection("card");
    getShiftPaymentButtons()[0]?.focus();
  });
}

function closeShiftPaymentModal(chosenMethod) {
  const modal = document.getElementById("shiftPaymentModal");
  if (modal) modal.classList.add("hidden");
  if (_shiftPaymentResolve) {
    _shiftPaymentResolve(chosenMethod || null);
    _shiftPaymentResolve = null;
  }
}

// Click on a payment option card
document.addEventListener("click", (e) => {
  const btn = e.target.closest("#shiftPaymentOptions .payment-method-option");
  if (btn) {
    setShiftPaymentSelection(btn.dataset.method, { focus: true });
    return;
  }
  if (e.target.closest("#shiftPaymentConfirm")) {
    const selected = document.querySelector("#shiftPaymentOptions .payment-method-option.is-selected");
    closeShiftPaymentModal(selected?.dataset.method || "card");
    return;
  }
  if (e.target.closest("#shiftPaymentCancel")) {
    closeShiftPaymentModal(null);
  }
});

// Keyboard navigation within payment modal
document.addEventListener("keydown", (e) => {
  const modal = document.getElementById("shiftPaymentModal");
  if (!modal || modal.classList.contains("hidden")) return;
  const buttons = getShiftPaymentButtons();
  const currentIdx = buttons.findIndex((b) => b === document.activeElement);
  if (e.key === "ArrowDown" || e.key === "ArrowRight") {
    e.preventDefault();
    const next = (currentIdx + 1) % buttons.length;
    setShiftPaymentSelection(buttons[next].dataset.method, { focus: true });
  } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
    e.preventDefault();
    const prev = (currentIdx - 1 + buttons.length) % buttons.length;
    setShiftPaymentSelection(buttons[prev].dataset.method, { focus: true });
  } else if (e.key === "Home") {
    e.preventDefault();
    setShiftPaymentSelection(buttons[0].dataset.method, { focus: true });
  } else if (e.key === "End") {
    e.preventDefault();
    setShiftPaymentSelection(buttons[buttons.length - 1].dataset.method, { focus: true });
  } else if (e.key === "Enter" || e.key === " ") {
    if (document.activeElement.closest("#shiftPaymentOptions")) {
      e.preventDefault();
      const selected = document.querySelector("#shiftPaymentOptions .payment-method-option.is-selected");
      closeShiftPaymentModal(selected?.dataset.method || "card");
    }
  } else if (e.key === "Escape") {
    closeShiftPaymentModal(null);
  }
});

// Legacy bridge used by accept-shift code
async function resolveShiftPaymentMethod() {
  return await openShiftPaymentModal();
}
