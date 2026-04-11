document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("themeToggle");
  const ICON_MOON = String.fromCodePoint(0x1f319);
  const ICON_SUN = String.fromCodePoint(0x2600, 0xfe0f);

  if (!toggle) {
    return;
  }

  // load saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    toggle.textContent = ICON_SUN;
  } else {
    toggle.textContent = ICON_MOON;
  }

  toggle.addEventListener("click", (event) => {
    if (event.shiftKey) {
      return;
    }

    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");

    toggle.textContent = isDark ? ICON_SUN : ICON_MOON;
  });
});

