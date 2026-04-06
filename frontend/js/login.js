// ── OAuth callback handling ──────────────────────────────────────
// When Google/LinkedIn redirects back here, the URL has ?token=JWT&oauth=provider
// or ?error=reason when something went wrong.
(async () => {
  const params = new URLSearchParams(window.location.search);
  const oauthToken = params.get("token");
  const oauthError = params.get("error");
  const oauthNote  = document.getElementById("oauthNote");

  if (oauthError) {
    const messages = {
      oauth_not_configured: "OAuth login is not enabled yet. Please use email/password.",
      oauth_denied:         "Sign-in was cancelled.",
      oauth_failed:         "OAuth sign-in failed. Please try again or use email/password."
    };
    if (oauthNote) {
      oauthNote.textContent = messages[oauthError] || "OAuth sign-in failed.";
      oauthNote.style.display = "block";
      oauthNote.style.color = "var(--danger, #dc2626)";
    }
    // Clean URL so refresh doesn't re-trigger
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (oauthToken) {
    localStorage.setItem("token", oauthToken);
    window.history.replaceState({}, document.title, window.location.pathname);
    try {
      const res = await fetch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${oauthToken}` }
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem("user", JSON.stringify(user));
        if (user.is_admin || user.role === "admin") return (window.location.href = "admin.html");
        if (user.role === "employer") return (window.location.href = "employer.html");
        return (window.location.href = "dashboard.html");
      }
    } catch { /* fall through */ }
    window.location.href = "dashboard.html";
    return;
  }

  // Disable OAuth buttons if provider not configured, and check provider availability
  try {
    const provRes = await fetch(`${API}/auth/providers`);
    if (provRes.ok) {
      const providers = await provRes.json();
      const googleBtn   = document.getElementById("googleOAuthBtn");
      const linkedinBtn = document.getElementById("linkedinOAuthBtn");
      if (googleBtn && !providers.google) {
        googleBtn.removeAttribute("href");
        googleBtn.style.opacity = "0.45";
        googleBtn.title = "Google OAuth not configured";
        googleBtn.addEventListener("click", (e) => {
          e.preventDefault();
          if (oauthNote) { oauthNote.textContent = "Google login is not enabled yet."; oauthNote.style.display = "block"; }
        });
      }
      if (linkedinBtn && !providers.linkedin) {
        linkedinBtn.removeAttribute("href");
        linkedinBtn.style.opacity = "0.45";
        linkedinBtn.title = "LinkedIn OAuth not configured";
        linkedinBtn.addEventListener("click", (e) => {
          e.preventDefault();
          if (oauthNote) { oauthNote.textContent = "LinkedIn login is not enabled yet."; oauthNote.style.display = "block"; }
        });
      }
    }
  } catch { /* provider check optional */ }
})();

// ── Redirect if already logged in ───────────────────────────────
const existingToken = localStorage.getItem("token");
const existingUserRaw = localStorage.getItem("user");

<<<<<<< HEAD
async function completeOAuthLogin() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) return false;

  try {
    localStorage.setItem("token", token);
    const res = await fetch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const user = await res.json();

    if (!res.ok) {
      throw new Error(user.message || "OAuth login failed");
    }

    localStorage.setItem("user", JSON.stringify(user));
    window.history.replaceState({}, document.title, "login.html");

    if (user.is_admin || user.role === "admin") {
      window.location.href = "admin.html";
    } else if (user.role === "employer") {
      window.location.href = "employer.html";
    } else {
      window.location.href = "dashboard.html";
    }
    return true;
  } catch (err) {
    console.error(err);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    alert(err.message || "OAuth login failed");
    return false;
  }
}

completeOAuthLogin();

=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
if (existingToken && existingUserRaw) {
  try {
    const existingUser = JSON.parse(existingUserRaw);
    if (existingUser?.is_admin || existingUser?.role === "admin") {
      window.location.href = "admin.html";
    } else if (existingUser?.role === "employer") {
      window.location.href = "employer.html";
    } else {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    localStorage.removeItem("user");
  }
}

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault(); // ⛔ stop page reload

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  fetch(`${API}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        alert("Login successful");

        // Honour ?redirect= param (same-origin only — prevent open redirect)
        const redirectParam = new URLSearchParams(window.location.search).get("redirect");
        if (redirectParam) {
          try {
            const target = new URL(redirectParam, window.location.origin);
            if (target.origin === window.location.origin) {
              window.location.href = target.href;
              return;
            }
          } catch {
            // Malformed URL — fall through to role-based default
          }
        }

        if (data.user.is_admin || data.user.role === "admin") {
          window.location.href = "admin.html";
        } else if (data.user.role === "employer") {
          window.location.href = "employer.html";
        } else {
          window.location.href = "dashboard.html";
        }
      } else {
        alert(data.message || "Login failed");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Server error");
    });
});
