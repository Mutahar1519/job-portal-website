function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) { console.info("[toast]", msg); return; }
  t.innerText = msg;
  t.style.display = "block";
  setTimeout(() => { t.style.display = "none"; }, 2500);
}

/* Escape HTML — use on every user-supplied value in innerHTML to prevent XSS */
function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

<<<<<<< HEAD
/* 🔐 authFetch: defined in config.js as a var — available globally.
   Do not redefine here. If config.js is not loaded, define a basic fallback. */
if (typeof authFetch === "undefined") {
  // eslint-disable-next-line no-var
  var authFetch = function(url, options = {}) {
    const token = localStorage.getItem("token");
    const isFormData = options.body instanceof FormData;
    const method = String(options.method || "GET").toUpperCase();
    const shouldSetJsonHeader = !isFormData && !["GET", "HEAD"].includes(method);
    return fetch(url, {
      ...options,
      headers: {
        ...(shouldSetJsonHeader ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  };
<<<<<<< HEAD
=======

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
  }).then(res => {
    if (!res.ok && res.status === 401) {
      console.error(`[authFetch] 401 Unauthorized for ${url}. Token may be expired or invalid.`);
    }
    return res;
  });
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
=======
/* 🔐 authFetch fallback: only define if config.js did not provide one */
if (!window.authFetch) {
  window.authFetch = function fallbackAuthFetch(url, options = {}) {
    const token = localStorage.getItem("token");
    const isFormData = options.body instanceof FormData;
    const method = String(options.method || "GET").toUpperCase();
    const shouldSetJsonContentType = !isFormData && options.body != null && method !== "GET" && method !== "HEAD";
    const baseHeaders = {
      ...(shouldSetJsonContentType ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    };

    if (token && token.trim()) {
      baseHeaders.Authorization = `Bearer ${token.trim()}`;
    }

    return fetch(url, {
      ...options,
      headers: {
        ...baseHeaders
      }
    }).then(res => {
      if (!res.ok && res.status === 401) {
        console.error(`[authFetch] 401 Unauthorized for ${url}. Token may be expired or invalid.`);
      }
      return res;
    });
  };
>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0
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

// Remember last job ID from job-related links (apply/details)
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;

  const href = link.getAttribute("href") || "";
  if (!/jobId=\d+/i.test(href) && !link.classList.contains("apply-btn")) {
    return;
  }

  const dataId = link.getAttribute("data-job-id");

  if (dataId) {
    sessionStorage.setItem("lastJobId", dataId);
    return;
  }

  const match = href.match(/[?&]jobId=(\d+)/);
  if (match) {
    sessionStorage.setItem("lastJobId", match[1]);
    return;
  }

  const fallbackMatch = href.match(/[?&]id=(\d+)/);
  if (fallbackMatch) {
    sessionStorage.setItem("lastJobId", fallbackMatch[1]);
  }
});

const exploreJobsBtn = document.getElementById("exploreJobsBtn");
if (exploreJobsBtn) {
  exploreJobsBtn.addEventListener("click", () => {
    window.location.href = "jobs.html";
  });
}
