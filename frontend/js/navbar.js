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

  const ensureFooterSocialLinks = () => {
    const footerBottom = document.querySelector(".site-footer .footer-bottom");
    if (!footerBottom) return;
    if (footerBottom.querySelector(".footer-social-links")) return;

    const socialWrap = document.createElement("span");
    socialWrap.className = "footer-social-links";
    socialWrap.style.marginLeft = "10px";
    socialWrap.innerHTML =
      ' | <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a> · ' +
      '<a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a> · ' +
      '<a href="https://x.com" target="_blank" rel="noopener noreferrer">X</a>';

    footerBottom.appendChild(socialWrap);
  };

  ensureFooterSocialLinks();

  const nav = document.querySelector(".navbar");

  const setupScrollReactiveNavbar = () => {
    if (!nav) return;

    const threshold = 10;
    let ticking = false;

    const applyState = () => {
      const shouldBeTransparent = window.scrollY > threshold;
      document.body.classList.toggle("navbar-scroll-transparent", shouldBeTransparent);
      ticking = false;
    };

    applyState();

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(applyState);
      },
      { passive: true }
    );
  };

  setupScrollReactiveNavbar();

  const removeLegacyThemeToggle = () => {
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.remove();
    }
  };

  removeLegacyThemeToggle();

  const ensureNavLeftLayout = () => {
    if (!nav) return;

    let navLeft = nav.querySelector(".nav-left");
    if (!navLeft) {
      navLeft = document.createElement("div");
      navLeft.className = "nav-left";
      const logo = nav.querySelector(".logo");
      if (logo) {
        nav.insertBefore(navLeft, logo);
        navLeft.appendChild(logo);
      } else {
        nav.prepend(navLeft);
      }
    }

    const navLinks = Array.from(nav.querySelectorAll("a.nav-link"));
    navLinks.forEach((link) => {
      if (link.parentElement !== navLeft) {
        navLeft.appendChild(link);
      }
    });

    const firstRightControl =
      nav.querySelector("#paletteSwitcher") ||
      nav.querySelector("#navMenuToggle") ||
      nav.querySelector(".nav-profile-chip") ||
      nav.querySelector("#themeToggle") ||
      nav.querySelector("#logoutBtn");

    if (firstRightControl && navLeft.nextElementSibling !== firstRightControl) {
      nav.insertBefore(navLeft, firstRightControl);
    }
  };

  ensureNavLeftLayout();

  // Guarantee a visible logo mark in navbar even on pages with legacy logo markup.
  const ensureNavLogoMark = () => {
    if (!nav) return;
    const forceFallbackPages = ["home-page", "job-detail-page", "post-job-page"];
    const shouldForceFallback = forceFallbackPages.some((className) =>
      document.body.classList.contains(className)
    );

    const logo = nav.querySelector(".logo");
    if (!logo) return;

    const existingMark = logo.querySelector(".logo-mark");
    if (existingMark) {
      existingMark.textContent = "JP";
      existingMark.setAttribute("aria-hidden", "true");
      return;
    }

    if (shouldForceFallback) {
      logo.querySelectorAll("i.fa-solid.fa-briefcase").forEach((node) => node.remove());
    }

    if (logo.querySelector("i") && !shouldForceFallback) return;

    const icon = document.createElement("span");
    icon.className = "logo-mark";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "JP";
    logo.prepend(icon);
  };

  ensureNavLogoMark();

  const paletteOptions = ["default", "ocean", "sunset", "forest"];
  const navHighlightOptions = ["mix", "solid"];
  const paletteLabels = {
    default: "Default",
    ocean: "Ocean",
    sunset: "Sunset",
    forest: "Forest",
  };
  const navHighlightLabels = {
    mix: "Mix",
    solid: "Same",
  };

  const applyNavHighlightMode = (mode) => {
    const selected = navHighlightOptions.includes(mode) ? mode : "mix";
    document.body.classList.remove("nav-highlight-mix", "nav-highlight-solid");
    document.body.classList.add(`nav-highlight-${selected}`);
    localStorage.setItem("navHighlightMode", selected);
  };

  const updatePaletteToggle = (selected) => {
    const paletteToggleBtn = document.getElementById("paletteToggle");
    const highlightMode = localStorage.getItem("navHighlightMode") || "mix";
    if (paletteToggleBtn) {
      paletteToggleBtn.textContent = `Palette: ${paletteLabels[selected] || "Default"} | Active: ${navHighlightLabels[highlightMode] || "Mix"}`;
      paletteToggleBtn.setAttribute(
        "aria-label",
        `Choose palette and navbar highlight mode (palette: ${paletteLabels[selected] || "Default"}, highlight: ${navHighlightLabels[highlightMode] || "Mix"})`
      );
    }

    const optionButtons = Array.from(document.querySelectorAll(".palette-option"));
    optionButtons.forEach((button) => {
      const isDarkToggle = button.dataset.palette === "dark";
      const isDarkNow = document.body.classList.contains("dark");
      const isPaletteOption = Boolean(button.dataset.palette) && !isDarkToggle;
      const isHighlightOption = Boolean(button.dataset.highlight);
      const isActive =
        (isPaletteOption && button.dataset.palette === selected) ||
        (isDarkToggle && isDarkNow) ||
        (isHighlightOption && button.dataset.highlight === highlightMode);
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
      const isDarkNow = document.body.classList.contains("dark");
      paletteMenu.innerHTML = paletteOptions
        .map((palette) => {
          const label = paletteLabels[palette] || palette;
          return `<button type="button" class="palette-option" role="menuitemradio" aria-checked="false" data-palette="${palette}"><span class="palette-swatch" aria-hidden="true"></span><span>${label}</span></button>`;
        })
        .join("") +
        `<hr style="margin:6px 0;border:none;border-top:1px solid var(--border);">` +
        `<button type="button" class="palette-option" role="menuitemradio" aria-checked="false" data-highlight="mix"><span class="palette-swatch" aria-hidden="true"></span><span>Active: Mix Colors</span></button>` +
        `<button type="button" class="palette-option" role="menuitemradio" aria-checked="false" data-highlight="solid"><span class="palette-swatch" aria-hidden="true"></span><span>Active: Same Color</span></button>` +
        `<hr style="margin:6px 0;border:none;border-top:1px solid var(--border);">` +
        `<button type="button" class="palette-option palette-dark-toggle" role="menuitemcheckbox" aria-checked="${isDarkNow}" data-palette="dark"><span class="palette-swatch" aria-hidden="true"></span><span>Dark Mode</span>${isDarkNow ? '<span style="margin-left:auto;font-size:12px;font-weight:700;">✓</span>' : ''}</button>`;
      paletteSwitcher.appendChild(paletteMenu);
    }

    if (paletteSwitcher.parentElement !== nav) {
      const anchor = nav.querySelector(".nav-profile-chip") || nav.querySelector("#logoutBtn");
      if (anchor) {
        nav.insertBefore(paletteSwitcher, anchor);
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
        const currentHighlight = localStorage.getItem("navHighlightMode") || "mix";
        const options = Array.from(paletteMenu.querySelectorAll(".palette-option"));
        if (!options.length) return;
        const selectedIndex = options.findIndex(
          (option) => option.dataset.palette === currentPalette || option.dataset.highlight === currentHighlight
        );
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
          const selectedPalette = focusedOption.dataset.palette;
          const selectedHighlight = focusedOption.dataset.highlight;
          if (selectedHighlight) {
            applyNavHighlightMode(selectedHighlight);
          } else if (selectedPalette === "dark") {
            const isDark = document.body.classList.toggle("dark");
            localStorage.setItem("theme", isDark ? "dark" : "light");
          } else {
            applyPalette(selectedPalette || "default");
          }
          updatePaletteToggle(localStorage.getItem("palette") || "default");
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
        const selectedHighlight = selectedButton.dataset.highlight;

        if (selectedHighlight) {
          applyNavHighlightMode(selectedHighlight);
          updatePaletteToggle(localStorage.getItem("palette") || "default");
          paletteSwitcher.classList.remove("open");
          paletteToggleBtn.setAttribute("aria-expanded", "false");
          return;
        }

        if (selectedPalette === "dark") {
          // Toggle dark mode
          const isDark = document.body.classList.toggle("dark");
          localStorage.setItem("theme", isDark ? "dark" : "light");
          // Update the dark toggle button state in the menu
          selectedButton.setAttribute("aria-checked", isDark ? "true" : "false");
          const checkSpan = selectedButton.querySelector("span:last-child");
          if (checkSpan && checkSpan !== selectedButton.querySelector("span:nth-child(2)")) {
            checkSpan.textContent = isDark ? "✓" : "";
          } else if (isDark) {
            const ck = document.createElement("span");
            ck.style.cssText = "margin-left:auto;font-size:12px;font-weight:700;";
            ck.textContent = "✓";
            selectedButton.appendChild(ck);
          }
          // Keep palette menu open for dark toggle
          updatePaletteToggle(localStorage.getItem("palette") || "default");
          return;
        }
        applyPalette(selectedPalette || "default");
        updatePaletteToggle(localStorage.getItem("palette") || "default");
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
  applyNavHighlightMode(localStorage.getItem("navHighlightMode") || "mix");

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

    const menuAnchor = document.getElementById("paletteSwitcher") || nav.querySelector(".nav-profile-chip") || nav.querySelector("#logoutBtn");
    if (menuAnchor) {
      nav.insertBefore(toggle, menuAnchor);
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

    const closeBtn = panel.querySelector(".nav-menu-close");
    const searchInput = panel.querySelector(".nav-menu-search");
    const menuLinks = Array.from(panel.querySelectorAll(".nav-menu-link"));

    const openMenu = () => {
      panel.classList.add("open");
      backdrop.classList.add("open");
      document.body.classList.add("nav-menu-open");
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
      document.body.classList.remove("nav-menu-open");
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

  const setNavVisibility = (selector, isVisible) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.style.display = isVisible ? "" : "none";
    });
  };

  const setMenuLinkVisibility = (href, isVisible) => {
    if (!panel) return;
    panel.querySelectorAll(`a.nav-menu-link[href='${href}']`).forEach((node) => {
      node.style.display = isVisible ? "flex" : "none";
    });
  };

  const navRole = String(navUser?.role || "").toLowerCase();
  const isAdmin = !!navUser?.is_admin || navRole === "admin";
  const isEmployer = navRole === "employer";
  const isJobSeeker = navRole === "job_seeker";
  const currentPathLast = (window.location.pathname || "").split("/").filter(Boolean).pop() || "index.html";
  const currentPage = currentPathLast.toLowerCase().endsWith(".html") ? currentPathLast.toLowerCase() : `${currentPathLast.toLowerCase()}.html`;

  if (navToken && navUser && !isAdmin) {
    // Job seekers should not see employer-only entries.
    setNavVisibility("#postJobLink", isEmployer);
    setMenuLinkVisibility("post-jobs.html", isEmployer);

    // Employers should not see job-seeker-only dashboard entry.
    setNavVisibility("#dashboardLink", isJobSeeker);
    setMenuLinkVisibility("dashboard.html", isJobSeeker);
  }

  if (currentPage === "company.html") {
    // Always show 'Company Profile' in navbar/profile links on company.html
    const companyLabel = "Company Profile";
    const profileHref = "company.html";

    const topProfile = document.getElementById("profileLink");
    if (topProfile) {
      topProfile.textContent = companyLabel;
      topProfile.setAttribute("href", profileHref);
    }

    const profileChip = document.querySelector("a.nav-profile-chip");
    if (profileChip) {
      profileChip.setAttribute("href", profileHref);
      profileChip.setAttribute("aria-label", companyLabel);
    }

    if (panel) {
      panel.querySelectorAll("a.nav-menu-link[href='profile.html']").forEach((node) => {
        node.setAttribute("href", profileHref);
        node.setAttribute("data-label", companyLabel);
        const labelNode = node.querySelector("span");
        if (labelNode) {
          labelNode.textContent = companyLabel;
        }
      });
    }
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
        "company.html": "company.html",
      "employer.html": "dashboard.html",
      "chat.html": "dashboard.html",
      "login.html": "login.html",
      "register.html": "login.html",
      "forgot-password.html": "login.html",
      "reset-password.html": "login.html",
      "verify-email.html": "login.html",
    };

    let target = routeToNavFile[current] || current;
    // Normalize menu and menu.html for highlighting
    if (target === "menu" || target === "menu.html") target = "menu.html";
    let navLinks = Array.from(document.querySelectorAll(".navbar a[href]"));

    // If the current page is not present in the navbar, add a temporary nav-link for it
    const alreadyInNavbar = navLinks.some(link => getHrefFileName(link.getAttribute("href")) === target);
    if (!alreadyInNavbar && current !== "index.html") {
      // Insert after logo in nav-left
      const navLeft = nav.querySelector(".nav-left");
      if (navLeft) {
        const tempLink = document.createElement("a");
        tempLink.className = "nav-link nav-active nav-temp";
        tempLink.href = current;
        tempLink.textContent = document.title.replace("| JobPortal", "").trim() || current.replace(/\.html$/, "");
        navLeft.appendChild(tempLink);
        navLinks = Array.from(document.querySelectorAll(".navbar a[href]"));
      }
    }
    navLinks.forEach((link) => {
      const isProfileChip = link.classList.contains("nav-profile-chip");
      const isLogo = link.classList.contains("logo");
      const isUtilityBell = link.classList.contains("nav-bell");
      const rawHref = String(link.getAttribute("href") || "").trim();
      const isHashOnlyLink = rawHref.startsWith("#");
      // Only remove nav-active from non-temp links
      if (!link.classList.contains("nav-temp")) link.classList.remove("nav-active");
      if (isProfileChip || isLogo || isUtilityBell || isHashOnlyLink) return;

      let href = getHrefFileName(rawHref);
      // Normalize menu and menu.html for highlighting
      if (href === "menu" || href === "menu.html") href = "menu.html";
      if (!href) return;
      // Always highlight menu.html for any hash on menu.html
      if (target === "menu.html" && href === "menu.html") {
        link.classList.add("nav-active");
      } else if (href === target) {
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

