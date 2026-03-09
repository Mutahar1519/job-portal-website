function toast(msg) {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.style.display = "block";

  setTimeout(() => t.style.display = "none", 2500);
}

function safeParseJson(value, label) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (err) {
    console.error(`Invalid JSON for ${label || "value"}`, err);
    return null;
  }
}

/* 🔐 authFetch: auto‑attach token */
function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;
  const baseHeaders = {
    ...(options.headers || {})
  };

  if (!isFormData) {
    baseHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    baseHeaders.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers: {
      ...baseHeaders
    }
  });
}

/* 🚪 Logout */
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});


/* 👤 Get logged user */
function getUser() {
  const raw = localStorage.getItem("user");
  const user = safeParseJson(raw, "localStorage.user");
  if (!user && raw) {
    localStorage.removeItem("user");
  }
  return user;
}

// Remember last job ID from any apply link click
document.addEventListener("click", (event) => {
  const link = event.target.closest("a.apply-btn");
  if (!link) return;

  const dataId = link.getAttribute("data-job-id");

  if (dataId) {
    sessionStorage.setItem("lastJobId", dataId);
    return;
  }

  const href = link.getAttribute("href") || "";
  const match = href.match(/[?&]jobId=(\d+)/);
  if (match) {
    sessionStorage.setItem("lastJobId", match[1]);
  }
});

const exploreJobsBtn = document.getElementById("exploreJobsBtn");
if (exploreJobsBtn) {
  exploreJobsBtn.addEventListener("click", () => {
    window.location.href = "jobs.html";
  });
}
