document.getElementById("resetPasswordForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const newPassword = document.getElementById("newPassword")?.value.trim();
  const confirmPassword = document.getElementById("confirmPassword")?.value.trim();
  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    showError("Reset token is missing");
    return;
  }

  if (!newPassword || newPassword.length < 6) {
    showWarning("Password must be at least 6 characters");
    return;
  }

  if (newPassword !== confirmPassword) {
    showError("Passwords do not match");
    return;
  }

  try {
    const res = await fetch(`${API}/users/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token, password: newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      showSuccess(data.message || "Password reset failed");
      return;
    }

    showSuccess("Password updated. Please log in.");
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    showError("Server error");
  }
});
