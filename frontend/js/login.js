const existingToken = localStorage.getItem("token");
const existingUserRaw = localStorage.getItem("user");

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
