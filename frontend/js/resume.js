document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Login required");
    window.location.href = "login.html";
    return;
  }

  const form = document.getElementById("resumeForm");
  const status = document.getElementById("resumeStatus");
  const preview = document.getElementById("resumePreview");
  const meta = document.getElementById("resumeMeta");
  const stats = document.getElementById("resumeStats");
  const skills = document.getElementById("resumeSkills");
  const fileInput = document.getElementById("resumeFile");
  const fileSelection = document.getElementById("resumeFileSelection");
  const uploadFeedback = document.getElementById("resumeUploadFeedback");

  const setStatus = (text) => {
    if (status) status.textContent = text;
  };

  const setUploadFeedback = (text) => {
    if (uploadFeedback) uploadFeedback.textContent = text;
  };

  const readResponsePayload = async (response) => {
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();

    try {
      if (contentType.includes("application/json")) {
        return await response.json();
      }

      const text = await response.text();
      if (!text) return null;

      try {
        return JSON.parse(text);
      } catch (_err) {
        return { message: text.slice(0, 300) };
      }
    } catch (_err) {
      return null;
    }
  };

  const getFileExtension = (nameOrPath) => {
    const raw = String(nameOrPath || "");
    const clean = raw.split("?")[0].split("#")[0];
    const dotIndex = clean.lastIndexOf(".");
    return dotIndex >= 0 ? clean.slice(dotIndex + 1).toLowerCase() : "";
  };

  const renderPreview = (text, emptyMessage = "No parsed text yet.") => {
    if (!preview) return;
    if (!text) {
      preview.innerHTML = `<p class="p-muted">${emptyMessage}</p>`;
      return;
    }
    preview.textContent = text;
  };

  const renderInsights = (text) => {
    if (!stats || !skills) return;

    if (!text) {
      stats.innerHTML = "<p class=\"p-muted\">Upload a resume to see insights.</p>";
      skills.innerHTML = "";
      return;
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const keywords = [
      "javascript",
      "react",
      "node",
      "typescript",
      "python",
      "sql",
      "aws",
      "docker",
      "figma",
      "product",
      "marketing",
      "design"
    ];

    const matches = keywords
      .map((skill) => ({
        skill,
        count: (text.toLowerCase().match(new RegExp(`\\b${skill}\\b`, "g")) || []).length
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    stats.innerHTML = `
      <div class="stat-card">
        <span class="stat-label">Word count</span>
        <span class="stat-value">${wordCount}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Skills detected</span>
        <span class="stat-value">${matches.length}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Match readiness</span>
        <span class="stat-value">${Math.min(95, 60 + matches.length * 6)}%</span>
      </div>
    `;

    skills.innerHTML = matches.length
      ? matches.map((item) => `<span class="pill">${item.skill}</span>`).join("")
      : "<span class=\"p-muted\">No skills detected yet.</span>";
  };

  const loadResume = async () => {
    try {
      const res = await authFetch(`${API}/resumes/me`);
      const data = await readResponsePayload(res);

      if (!res.ok || !data) {
        setStatus("Upload a resume to get started.");
        setUploadFeedback("");
        renderPreview("", "No resume uploaded yet.");
        renderInsights("");
        if (meta) meta.textContent = "";
        if (fileSelection) fileSelection.textContent = "No file selected yet.";
        return;
      }

      const ext = getFileExtension(data.file_path);
      const hasParsedText = Boolean(data.extracted_text);

      if (hasParsedText) {
        setStatus("Resume uploaded and parsed.");
        renderPreview(data.extracted_text || "");
      } else if (["pdf", "docx", "doc"].includes(ext)) {
        setStatus("Resume uploaded. No readable text found yet.");
        renderPreview("", "Your resume is uploaded, but no readable text was found. Try exporting the file again as a text-based PDF, DOCX, or DOC and upload again.");
      } else {
        setStatus("Resume uploaded. No readable text found yet.");
        renderPreview("", "Your resume is uploaded, but no readable text was found. If it is a scanned/image PDF, export it as a text-based PDF and upload again.");
      }

      renderInsights(data.extracted_text || "");
      if (meta) {
        const updated = data.updated_at ? new Date(data.updated_at).toLocaleString() : "";
        meta.textContent = updated ? `Last updated: ${updated}` : "";
      }
      setUploadFeedback("Resume file is saved on your account.");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load resume.");
    }
  };

  fileInput?.addEventListener("change", () => {
    const selected = fileInput.files?.[0];
    if (fileSelection) {
      fileSelection.textContent = selected
        ? `Selected file: ${selected.name} (${Math.max(1, Math.round(selected.size / 1024))} KB)`
        : "No file selected yet.";
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = fileInput?.files?.[0];
    if (!file) {
      alert("Select a resume file (PDF, DOC, or DOCX)");
      return;
    }

    const selectedExt = getFileExtension(file.name);
    if (!["pdf", "doc", "docx"].includes(selectedExt)) {
      alert("Only PDF, DOC, or DOCX files are allowed.");
      setUploadFeedback("Unsupported file type. Please upload PDF, DOC, or DOCX.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setStatus("Uploading resume...");
      setUploadFeedback("");
      const res = await authFetch(`${API}/resumes`, {
        method: "POST",
        body: formData
      });

      const data = await readResponsePayload(res);
      if (!res.ok) {
        const message = data?.message || `Upload failed (HTTP ${res.status})`;
        if (res.status === 401) {
          alert("Your session expired. Please login again.");
          setStatus("Login required.");
          setUploadFeedback("Session expired. Please login and retry upload.");
          return;
        }

        alert(message);
        setStatus("Upload failed.");
        setUploadFeedback(message);
        return;
      }

      setStatus(data.parsed ? "Resume parsed successfully." : "Resume uploaded successfully.");
      setUploadFeedback(data.parseMessage || "Resume uploaded successfully.");
      await loadResume();
    } catch (err) {
      console.error(err);
      setStatus("Upload failed.");
      if (!navigator.onLine) {
        setUploadFeedback("You appear to be offline. Reconnect to the internet and try again.");
        return;
      }

      const reason = String(err?.message || "");
      if (/failed to fetch|networkerror|load failed/i.test(reason)) {
        setUploadFeedback("Cannot reach backend at http://localhost:3000. Start backend server and try again.");
        return;
      }

      setUploadFeedback("Server request failed unexpectedly. Please retry in a moment.");
    }
  });

  await loadResume();
});
