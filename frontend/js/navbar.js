(() => {
  const safeParseUser = () => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error("Invalid JSON in localStorage.user", err);
      localStorage.removeItem("user");
      return null;
    }
  };

  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }

  const ensureSkipLink = () => {
    const main = document.querySelector("main");
    if (!main) return;

    if (!main.id) {
      main.id = "main-content";
    }

    if (document.querySelector(".skip-link")) return;

    const skipLink = document.createElement("a");
    skipLink.className = "skip-link";
    skipLink.href = `#${main.id}`;
    skipLink.textContent = "Skip to main content";
    document.body.prepend(skipLink);
  };

  ensureSkipLink();

  const ensureToastA11y = () => {
    const toast = document.getElementById("toast");
    if (!toast) return;

    // Use polite live region semantics for non-blocking status updates.
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
  };

  ensureToastA11y();

  const nav = document.querySelector(".navbar");

  // Guarantee a visible logo mark in navbar even on pages with legacy logo markup.
  const ensureNavLogoMark = () => {
    if (!nav) return;
    const forceFallbackPages = ["home-page", "job-detail-page", "post-job-page"];
    const shouldForceFallback = forceFallbackPages.some((className) =>
      document.body.classList.contains(className)
    );

    const logo = nav.querySelector(".logo");
    if (!logo) return;

    if (shouldForceFallback) {
      logo.querySelectorAll("i.fa-solid.fa-briefcase").forEach((node) => node.remove());
    }

    if (logo.querySelector(".logo-mark")) return;
    if (logo.querySelector("i") && !shouldForceFallback) return;

    const icon = document.createElement("span");
    icon.className = "logo-mark";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "JP";
    logo.prepend(icon);
  };

  ensureNavLogoMark();

  const paletteOptions = ["default", "ocean", "sunset", "forest"];
  const paletteLabels = {
    default: "Default",
    ocean: "Ocean",
    sunset: "Sunset",
    forest: "Forest",
  };

  const updatePaletteToggle = (selected) => {
    const paletteToggleBtn = document.getElementById("paletteToggle");
    if (paletteToggleBtn) {
      paletteToggleBtn.textContent = `Palette: ${paletteLabels[selected] || "Default"}`;
      paletteToggleBtn.setAttribute(
        "aria-label",
        `Choose palette (current: ${paletteLabels[selected] || "Default"})`
      );
    }

    const optionButtons = Array.from(document.querySelectorAll(".palette-option"));
    optionButtons.forEach((button) => {
      const isActive = button.dataset.palette === selected;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-checked", isActive ? "true" : "false");
    });
  };

  const applyPalette = (palette) => {
    const selected = paletteOptions.includes(palette) ? palette : "default";
    document.body.classList.remove(
      "palette-default",
      "palette-ocean",
      "palette-sunset",
      "palette-forest"
    );
    document.body.classList.add(`palette-${selected}`);
    localStorage.setItem("palette", selected);

    const themeToggleBtn = document.getElementById("themeToggle");
    if (themeToggleBtn) {
      themeToggleBtn.title = `Theme: left click | Palette: ${selected} (right click or Alt+P to change)`;
    }

    updatePaletteToggle(selected);
  };

  const cyclePalette = () => {
    const current = localStorage.getItem("palette") || "default";
    const currentIndex = paletteOptions.indexOf(current);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % paletteOptions.length : 0;
    applyPalette(paletteOptions[nextIndex]);
  };

  const ensurePaletteToggle = () => {
    if (!nav) return;

    let paletteSwitcher = document.getElementById("paletteSwitcher");
    let paletteToggleBtn = document.getElementById("paletteToggle");
    let paletteMenu = document.getElementById("paletteMenu");

    if (!paletteSwitcher) {
      paletteSwitcher = document.createElement("div");
      paletteSwitcher.id = "paletteSwitcher";
      paletteSwitcher.className = "palette-switcher";
    }

    if (!paletteToggleBtn) {
      paletteToggleBtn = document.createElement("button");
      paletteToggleBtn.id = "paletteToggle";
      paletteToggleBtn.className = "btn btn-outline palette-toggle";
      paletteToggleBtn.type = "button";
      paletteToggleBtn.setAttribute("aria-haspopup", "true");
      paletteToggleBtn.setAttribute("aria-expanded", "false");
      paletteToggleBtn.setAttribute("aria-controls", "paletteMenu");
      paletteSwitcher.appendChild(paletteToggleBtn);
    } else if (paletteToggleBtn.parentElement !== paletteSwitcher) {
      paletteSwitcher.appendChild(paletteToggleBtn);
    }

    if (!paletteMenu) {
      paletteMenu = document.createElement("div");
      paletteMenu.id = "paletteMenu";
      paletteMenu.className = "palette-menu";
      paletteMenu.setAttribute("role", "menu");
      paletteMenu.innerHTML = paletteOptions
        .map((palette) => {
          const label = paletteLabels[palette] || palette;
          return `<button type="button" class="palette-option" role="menuitemradio" aria-checked="false" data-palette="${palette}"><span class="palette-swatch" aria-hidden="true"></span><span>${label}</span></button>`;
        })
        .join("");
      paletteSwitcher.appendChild(paletteMenu);
    }

    if (paletteSwitcher.parentElement !== nav) {
      const themeToggleBtn = document.getElementById("themeToggle");
      if (themeToggleBtn) {
        nav.insertBefore(paletteSwitcher, themeToggleBtn);
      } else {
        nav.appendChild(paletteSwitcher);
      }
    }

    if (paletteToggleBtn.dataset.paletteBound !== "true") {
      paletteToggleBtn.dataset.paletteBound = "true";
      const openPaletteMenu = () => {
        paletteSwitcher.classList.add("open");
        paletteToggleBtn.setAttribute("aria-expanded", "true");
      };
      const closePaletteMenu = () => {
        paletteSwitcher.classList.remove("open");
        paletteToggleBtn.setAttribute("aria-expanded", "false");
      };
      const focusPaletteOption = (index) => {
        const options = Array.from(paletteMenu.querySelectorAll(".palette-option"));
        if (!options.length) return;
        const normalized = Math.max(0, Math.min(index, options.length - 1));
        options[normalized].focus();
      };
      const focusSelectedPaletteOption = () => {
        const currentPalette = localStorage.getItem("palette") || "default";
        const options = Array.from(paletteMenu.querySelectorAll(".palette-option"));
        if (!options.length) return;
        const selectedIndex = options.findIndex((option) => option.dataset.palette === currentPalette);
        focusPaletteOption(selectedIndex >= 0 ? selectedIndex : 0);
      };

      paletteToggleBtn.addEventListener("click", () => {
        const isOpen = paletteSwitcher.classList.contains("open");
        if (isOpen) {
          closePaletteMenu();
          return;
        }
        openPaletteMenu();
        focusSelectedPaletteOption();
      });

      paletteToggleBtn.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPaletteMenu();
          if (event.key === "ArrowUp") {
            const options = Array.from(paletteMenu.querySelectorAll(".palette-option"));
            focusPaletteOption(options.length - 1);
            return;
          }
          focusSelectedPaletteOption();
        }
      });

      paletteMenu.addEventListener("keydown", (event) => {
        const options = Array.from(paletteMenu.querySelectorAll(".palette-option"));
        if (!options.length) return;
        const currentIndex = options.indexOf(document.activeElement);

        if (event.key === "ArrowDown") {
          event.preventDefault();
          focusPaletteOption(currentIndex + 1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          focusPaletteOption(currentIndex - 1);
        } else if (event.key === "Home") {
          event.preventDefault();
          focusPaletteOption(0);
        } else if (event.key === "End") {
          event.preventDefault();
          focusPaletteOption(options.length - 1);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const focusedOption = document.activeElement;
          if (!focusedOption || !focusedOption.classList.contains("palette-option")) return;
          applyPalette(focusedOption.dataset.palette || "default");
          closePaletteMenu();
          paletteToggleBtn.focus();
        } else if (event.key === "Escape") {
          event.preventDefault();
          closePaletteMenu();
          paletteToggleBtn.focus();
        }
      });

      paletteSwitcher.dataset.openMenu = "bound";
    }

    if (paletteMenu.dataset.paletteBound !== "true") {
      paletteMenu.dataset.paletteBound = "true";
      paletteMenu.addEventListener("click", (event) => {
        const selectedButton = event.target.closest(".palette-option");
        if (!selectedButton || !selectedButton.classList.contains("palette-option")) return;
        const selectedPalette = selectedButton.dataset.palette;
        applyPalette(selectedPalette || "default");
        paletteSwitcher.classList.remove("open");
        paletteToggleBtn.setAttribute("aria-expanded", "false");
      });
    }

    if (paletteSwitcher.dataset.outsideBound !== "true") {
      paletteSwitcher.dataset.outsideBound = "true";
      document.addEventListener("click", (event) => {
        if (paletteSwitcher.contains(event.target)) return;
        paletteSwitcher.classList.remove("open");
        paletteToggleBtn.setAttribute("aria-expanded", "false");
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        paletteSwitcher.classList.remove("open");
        paletteToggleBtn.setAttribute("aria-expanded", "false");
      });
    }

    updatePaletteToggle(localStorage.getItem("palette") || "default");
  };

  ensurePaletteToggle();

  applyPalette(localStorage.getItem("palette") || "default");

  const attachPaletteHandlers = () => {
    const themeToggleBtn = document.getElementById("themeToggle");
    if (!themeToggleBtn || themeToggleBtn.dataset.paletteBound === "true") return;

    themeToggleBtn.dataset.paletteBound = "true";
    themeToggleBtn.title =
      "Theme: click | Palette: Shift+click, right click, or Alt+P";

    // Use capture so Shift+click can switch palette before theme.js click handler runs.
    themeToggleBtn.addEventListener(
      "click",
      (event) => {
        if (!event.shiftKey) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        cyclePalette();
      },
      true
    );

    themeToggleBtn.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      cyclePalette();
    });
  };

  attachPaletteHandlers();

  document.addEventListener("keydown", (event) => {
    const isAltP = event.altKey && (event.key === "p" || event.key === "P");
    if (!isAltP) return;

    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }

    event.preventDefault();
    cyclePalette();
  });

  let panel = null;
  if (nav && !document.getElementById("navMenuToggle")) {
    const toggle = document.createElement("button");
    toggle.id = "navMenuToggle";
    toggle.className = "nav-menu-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Open menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "<span></span><span></span><span></span>";

    panel = document.createElement("div");
    panel.id = "navMenuPanel";
    panel.className = "nav-menu-panel";
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <div class="nav-menu-head">
        <div>
          <p class="eyebrow">Explore</p>
          <h3 class="h2">Menu</h3>
          <p class="p-muted">Everything in one place.</p>
        </div>
        <button class="nav-menu-close" type="button" aria-label="Close menu">&times;</button>
      </div>
      <input class="nav-menu-search" type="text" placeholder="Search menu" aria-label="Search menu" />
      <div class="nav-menu-grid">
        <div class="nav-menu-col">
          <p class="nav-menu-title">Explore</p>
          <a class="nav-menu-link" href="index.html" data-label="Home">
            <span>Home</span><span class="nav-menu-link-arrow">></span>
          </a>
          <a class="nav-menu-link" href="jobs.html" data-label="Jobs">
            <span>Jobs</span><span class="nav-menu-link-arrow">></span>
          </a>
          <a class="nav-menu-link" href="company.html" data-label="Companies">
            <span>Companies</span><span class="nav-menu-link-arrow">></span>
          </a>
          <a class="nav-menu-link" href="menu.html#reviews" data-label="Reviews">
            <span>Reviews</span><span class="nav-menu-link-arrow">></span>
          </a>
          <a class="nav-menu-link" href="menu.html#salary" data-label="Salary">
            <span>Salary</span><span class="nav-menu-link-arrow">></span>
          </a>
        </div>
        <div class="nav-menu-col">
          <p class="nav-menu-title">Account</p>
          <a class="nav-menu-link" href="profile.html" data-label="Profile">
            <span>Profile</span><span class="nav-menu-link-arrow">></span>
          </a>
          <a class="nav-menu-link" href="menu.html#my-reviews" data-label="My Reviews">
            <span>My Reviews</span><span class="nav-menu-link-arrow">></span>
          </a>
          <a class="nav-menu-link" href="menu.html#settings" data-label="Settings">
            <span>Settings</span><span class="nav-menu-link-arrow">></span>
          </a>
          <a class="nav-menu-link" href="dashboard.html" data-label="Dashboard">
            <span>Dashboard</span><span class="nav-menu-link-arrow">></span>
          </a>
        </div>
        <div class="nav-menu-col">
          <p class="nav-menu-title">Support</p>
          <a class="nav-menu-link" href="menu.html#help" data-label="Help">
            <span>Help</span><span class="nav-menu-link-arrow">></span>
          </a>
          <a class="nav-menu-link" href="menu.html#terms" data-label="Terms">
            <span>Terms</span><span class="nav-menu-link-arrow">></span>
          </a>
          <a class="nav-menu-link" href="menu.html#privacy" data-label="Privacy">
            <span>Privacy</span><span class="nav-menu-link-arrow">></span>
          </a>
          <a class="nav-menu-link" href="menu.html#trust" data-label="Trust Center">
            <span>Trust Center</span><span class="nav-menu-link-arrow">></span>
          </a>
          <a class="nav-menu-link" href="about.html" data-label="About Us">
            <span>About Us</span><span class="nav-menu-link-arrow">></span>
          </a>
        </div>
      </div>
    `;

    const backdrop = document.createElement("div");
    backdrop.id = "navMenuBackdrop";
    backdrop.className = "nav-menu-backdrop";

    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      nav.insertBefore(toggle, themeToggle);
    } else {
      nav.appendChild(toggle);
    }

    const jobsLink = nav.querySelector("a[href='jobs.html']");
    if (jobsLink && !document.getElementById("aboutLink")) {
      const aboutLink = document.createElement("a");
      aboutLink.id = "aboutLink";
      aboutLink.href = "about.html";
      aboutLink.textContent = "About";
      jobsLink.insertAdjacentElement("afterend", aboutLink);
    }

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    attachPaletteHandlers();

    const closeBtn = panel.querySelector(".nav-menu-close");
    const searchInput = panel.querySelector(".nav-menu-search");
    const menuLinks = Array.from(panel.querySelectorAll(".nav-menu-link"));

    const openMenu = () => {
      panel.classList.add("open");
      backdrop.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      panel.setAttribute("aria-hidden", "false");
      if ("inert" in panel) {
        panel.inert = false;
      }
    };
    const closeMenu = () => {
      if (panel.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      panel.classList.remove("open");
      backdrop.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");
      if ("inert" in panel) {
        panel.inert = true;
      }
    };

    if ("inert" in panel) {
      panel.inert = true;
    }

    toggle.addEventListener("click", () => {
      if (panel.classList.contains("open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    backdrop.addEventListener("click", closeMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);

    panel.addEventListener("click", (event) => {
      if (event.target && event.target.matches(".nav-menu-link")) {
        closeMenu();
      }
    });

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        menuLinks.forEach((link) => {
          const label = (link.getAttribute("data-label") || link.textContent || "").toLowerCase();
          link.style.display = label.includes(query) ? "flex" : "none";
        });
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });
  }

  const navToken = localStorage.getItem("token");
  const navUser = safeParseUser();

  const loginLink = document.getElementById("loginLink");
  const registerLink = document.getElementById("registerLink");
  const logoutBtn = document.getElementById("logoutBtn");
  const adminLink = document.getElementById("adminLink");

  if (navToken && navUser) {
    // Logged in
    if (loginLink) loginLink.style.display = "none";
    if (registerLink) registerLink.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";

    // Show admin link only for admins
    if (adminLink) {
      adminLink.style.display = navUser.is_admin ? "inline-block" : "none";
    }
  } else {
    // Logged out
    if (logoutBtn) logoutBtn.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "index.html";
    });
  }

  const getFileName = (value) => {
    const clean = (value || "")
      .split("#")[0]
      .split("?")[0]
      .replace(/\\/g, "/")
      .trim();

    if (!clean) return "index.html";

    const parts = clean.split("/").filter(Boolean);
    const last = (parts.pop() || "index.html").toLowerCase();

    if (last.endsWith(".html")) return last;

    // Support extension-less page routes such as /jobs or /dashboard.
    if (!last.includes(".")) return `${last}.html`;

    return "index.html";
  };

  const getHrefFileName = (hrefValue) => {
    if (!hrefValue) return "";
    try {
      const parsed = new URL(hrefValue, window.location.href);
      return getFileName(parsed.pathname);
    } catch {
      return getFileName(hrefValue);
    }
  };

  const getHrefTarget = (hrefValue) => {
    if (!hrefValue) return { file: "", hash: "" };
    try {
      const parsed = new URL(hrefValue, window.location.href);
      return {
        file: getFileName(parsed.pathname),
        hash: (parsed.hash || "").toLowerCase(),
      };
    } catch {
      const [pathPart, hashPart] = String(hrefValue).split("#");
      return {
        file: getFileName(pathPart),
        hash: hashPart ? `#${hashPart}`.toLowerCase() : "",
      };
    }
  };

  const setActiveNav = () => {
    const current = getFileName(window.location.pathname);
    const currentHash = (window.location.hash || "").toLowerCase();
    const routeToNavFile = {
      "index.html": "index.html",
      "jobs.html": "jobs.html",
      "job.html": "jobs.html",
      "apply.html": "jobs.html",
      "dashboard.html": "dashboard.html",
      "profile.html": "profile.html",
      "post-jobs.html": "post-jobs.html",
      "admin.html": "admin.html",
      "menu.html": "menu.html",
      "about.html": "about.html",
      "resume.html": "profile.html",
      "company.html": "profile.html",
      "employer.html": "post-jobs.html",
      "chat.html": "dashboard.html",
      "login.html": "login.html",
      "register.html": "login.html",
      "forgot-password.html": "login.html",
      "reset-password.html": "login.html",
      "verify-email.html": "login.html",
    };

    const target = routeToNavFile[current] || current;
    const navLinks = Array.from(document.querySelectorAll(".navbar a[href]"));
    navLinks.forEach((link) => {
      const isProfileChip = link.classList.contains("nav-profile-chip");
      const isLogo = link.classList.contains("logo");
      link.classList.remove("nav-active");
      if (isProfileChip || isLogo) return;

      const href = getHrefFileName(link.getAttribute("href"));
      if (!href) return;
      if (href === target) {
        link.classList.add("nav-active");
      }
    });

    if (panel) {
      const menuLinksActive = Array.from(panel.querySelectorAll(".nav-menu-link"));
      menuLinksActive.forEach((link) => {
        link.classList.remove("nav-active");
        const hrefTarget = getHrefTarget(link.getAttribute("href"));
        if (!hrefTarget.file) return;

        const hasHashTarget = Boolean(hrefTarget.hash);
        const samePage = hrefTarget.file === current;
        const isHashMatch = hasHashTarget && samePage && hrefTarget.hash === currentHash;
        const isFileMatch = !hasHashTarget && hrefTarget.file === target;

        if (isHashMatch || isFileMatch) {
          link.classList.add("nav-active");
        }
      });
    }
  };

  setActiveNav();
  window.addEventListener("hashchange", setActiveNav);
  window.addEventListener("popstate", setActiveNav);
})();

