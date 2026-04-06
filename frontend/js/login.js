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
