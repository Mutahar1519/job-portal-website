(() => {
  const uiToken = localStorage.getItem("token");
  const rawUser = localStorage.getItem("user");
  let uiUser = null;
  if (rawUser) {
    try {
      uiUser = JSON.parse(rawUser);
    } catch (err) {
      console.error("Invalid JSON in localStorage.user", err);
      localStorage.removeItem("user");
    }
  }

  const loginLink = document.getElementById("loginLink");
  const logoutBtn = document.getElementById("logoutBtn");
  const userInfo = document.getElementById("userInfo");
  const adminLink = document.getElementById("adminLink");
  const postJobLink = document.getElementById("postJobLink");
  const dashboardLink = document.getElementById("dashboardLink");
  const menuLink = document.getElementById("menuLink");
  const profileLink = document.getElementById("profileLink");
  const navBar = document.querySelector(".navbar");
  let shiftBadge = null;
  let bellLink = document.getElementById("shiftBell");

  // DEFAULT: hide admin + post job
  if (adminLink) adminLink.style.display = "none";
  if (postJobLink) postJobLink.style.display = "none";
  if (dashboardLink) dashboardLink.style.display = "none";
  if (profileLink) profileLink.style.display = "none";

  if (uiToken && uiUser) {
    // Logged in
    if (loginLink) loginLink.style.display = "none";

    if (logoutBtn) logoutBtn.classList.remove("hidden");
    if (dashboardLink) dashboardLink.style.display = "inline-block";
    if (profileLink) profileLink.style.display = "inline-block";
    if (userInfo) {
      userInfo.classList.remove("hidden");
      userInfo.innerText = `👤 ${uiUser.name || uiUser.email}`;
    }

    // Admin only
    if (uiUser.is_admin) {
      if (adminLink) adminLink.style.display = "inline-block";
      if (postJobLink) postJobLink.style.display = "inline-block";
    }

    if (dashboardLink) {
      if (!bellLink) {
        bellLink = document.createElement("a");
        bellLink.id = "shiftBell";
        bellLink.href = "dashboard.html#shift-alerts";
        bellLink.className = "nav-bell";
        bellLink.setAttribute("aria-label", "Shift alerts");
        bellLink.innerHTML = '<span class="nav-bell-icon">🔔</span>';

        shiftBadge = document.createElement("span");
        shiftBadge.className = "nav-badge hidden";
        shiftBadge.textContent = "0";
        bellLink.appendChild(shiftBadge);

        if (navBar) {
          navBar.appendChild(bellLink);
        } else {
          dashboardLink.insertAdjacentElement("afterend", bellLink);
        }
      } else {
        shiftBadge = bellLink.querySelector(".nav-badge");
        if (navBar) {
          navBar.appendChild(bellLink);
        }
      }

      bellLink.style.display = "inline-flex";
    }
  } else {
    // Not logged in
    if (loginLink) loginLink.style.display = "inline-block";
    if (logoutBtn) logoutBtn.classList.add("hidden");
    if (userInfo) userInfo.classList.add("hidden");
    if (profileLink) profileLink.style.display = "none";
    if (bellLink) bellLink.style.display = "none";
  }

  const refreshShiftBadge = async () => {
    if (!uiToken || !shiftBadge || !window.API) return;

    const request = window.authFetch
      ? window.authFetch
      : (url, options = {}) => {
          return fetch(url, {
            ...options,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${uiToken}`
            }
          });
        };

    try {
      const res = await request(`${API}/job-alerts/shift-notifications`);
      const data = await res.json();
      if (!res.ok) return;
      const unread = (data || []).filter(item => !item.is_read).length;
      if (unread > 0) {
        shiftBadge.textContent = String(unread);
        shiftBadge.classList.remove("hidden");
      } else {
        shiftBadge.textContent = "0";
        shiftBadge.classList.add("hidden");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // LOGOUT
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "index.html";
    });
  }

  if (uiToken && uiUser) {
    refreshShiftBadge();
    setInterval(refreshShiftBadge, 60000);
  }
})();
