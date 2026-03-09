(function () {
  const sectionTabSelector =
    ".menu-tabs a[href^='#'], .about-tabs a[href^='#'], .resume-tabs a[href^='#'], .profile-tabs a[href^='#'], .employer-tabs a[href^='#'], .company-tabs a[href^='#'], .dashboard-tabs a[href^='#']";

  const tabAnchors = Array.from(
    document.querySelectorAll(sectionTabSelector)
  );

  if (!tabAnchors.length) return;

  const tabEntries = tabAnchors
    .map((anchor) => {
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return null;
      const section = document.getElementById(id);
      if (!section) return null;
      return { anchor, id, section };
    })
    .filter(Boolean);

  if (!tabEntries.length) return;

  const setActive = (targetId) => {
    tabEntries.forEach(({ anchor, id }) => {
      const isActive = id === targetId;
      anchor.classList.toggle("is-active", isActive);
      if (isActive) {
        anchor.setAttribute("aria-current", "location");
      } else {
        anchor.removeAttribute("aria-current");
      }
    });
  };

  const getStickyOffset = () => {
    const navHeight =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--nav-height"),
        10
      ) || 68;
    return navHeight + 14;
  };

  const scrollToSection = (section) => {
    const top =
      window.scrollY + section.getBoundingClientRect().top - getStickyOffset();
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

    window.scrollTo({ top: Math.max(top, 0), behavior });
  };

  const activateFromHash = () => {
    const hashId = decodeURIComponent(window.location.hash.replace("#", ""));
    if (!hashId) {
      setActive(tabEntries[0].id);
      return;
    }
    const found = tabEntries.find(({ id }) => id === hashId);
    if (found) setActive(found.id);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (!visible.length) return;
      setActive(visible[0].target.id);
    },
    {
      rootMargin: "-25% 0px -55% 0px",
      threshold: [0.2, 0.4, 0.6],
    }
  );

  tabEntries.forEach(({ section }) => observer.observe(section));

  tabAnchors.forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return;
      const found = tabEntries.find((entry) => entry.id === id);
      if (!found) return;

      event.preventDefault();
      setActive(id);
      scrollToSection(found.section);
      if (window.location.hash !== `#${id}`) {
        history.replaceState(null, "", `#${id}`);
      }
    });
  });

  window.addEventListener("hashchange", activateFromHash);
  activateFromHash();
})();
