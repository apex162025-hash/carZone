export function theme() {
  return localStorage.getItem("carzen_theme") === "dark" ? "dark" : "light";
}

export function setTheme(mode) {
  localStorage.setItem("carzen_theme", mode);
  if (mode === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
}
