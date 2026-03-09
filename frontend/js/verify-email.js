(() => {
  const statusEl = document.getElementById("verifyStatus");
  const messageEl = document.getElementById("verifyMessage");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const setStatus = (title, detail) => {
    if (statusEl) statusEl.textContent = title;
    if (messageEl) messageEl.textContent = detail || "";
  };

  if (!token) {
    setStatus("Verification link missing", "Please check your email and open the latest verification link.");
    return;
  }

  fetch(`${API}/users/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Verification failed");
      }
      setStatus("Email verified", "Your account is verified. You can now log in.");
    })
    .catch((err) => {
      console.error(err);
      setStatus("Verification failed", err.message || "Please request a new verification email.");
    });
})();
