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
        window.location.href = "index.html";
      } else {
        alert(data.message || "Login failed");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Server error");
    });
});
