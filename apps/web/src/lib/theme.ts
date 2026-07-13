/** Shared theme switcher — used by the footer toggle and the D shortcut. */
export function toggleTheme(): "light" | "dark" {
  const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* private mode */
  }
  return next;
}
