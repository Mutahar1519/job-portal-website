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

  const setStatus = (text) => {
    if (status) status.textContent = text;
  };

  const renderPreview = (text) => {
    if (!preview) return;
    if (!text) {
      preview.innerHTML = "<p class=\"p-muted\">No parsed text yet.</p>";
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
      const data = await res.json();

      if (!res.ok || !data) {
        setStatus("Upload a resume to get started.");
        renderPreview("");
        if (meta) meta.textContent = "";
        return;
      }

      setStatus("Resume on file.");
      renderPreview(data.extracted_text || "");
      renderInsights(data.extracted_text || "");
      if (meta) {
        const updated = data.updated_at ? new Date(data.updated_at).toLocaleString() : "";
        meta.textContent = updated ? `Last updated: ${updated}` : "";
      }
    } catch (err) {
      console.error(err);
      setStatus("Failed to load resume.");
    }
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fileInput = document.getElementById("resumeFile");
    const file = fileInput?.files?.[0];
    if (!file) {
      alert("Select a PDF file");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setStatus("Uploading...");
      const res = await authFetch(`${API}/resumes`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Upload failed");
        setStatus("Upload failed.");
        return;
      }

      setStatus(data.parsed ? "Resume parsed successfully." : "Uploaded. Parsing unavailable.");
      await loadResume();
    } catch (err) {
      console.error(err);
      setStatus("Upload failed.");
    }
  });

  await loadResume();
});
