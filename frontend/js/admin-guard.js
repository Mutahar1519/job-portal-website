(() => {
  const token = localStorage.getItem("token");
  const rawUser = localStorage.getItem("user");
  let user = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch (err) {
      console.error("Invalid JSON in localStorage.user", err);
      localStorage.removeItem("user");
    }
  }

  if (!token || !user || !user.is_admin) {
    showError("Access denied. Admins only.");
    window.location.href = "login.html";
  }
})();
