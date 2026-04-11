document.getElementById("forgotPasswordForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("forgotEmail")?.value.trim();
  if (!email) {
    showWarning("Email is required");
    return;
  }

  try {
    const res = await fetch(`${API}/users/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (!res.ok) {
      showError(data.message || "Failed to request reset");
      return;
    }

    showSuccess(data.message || "If that email exists, a reset link was sent.");
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    showError("Server error");
  }
});
