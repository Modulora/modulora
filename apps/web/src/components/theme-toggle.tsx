/** Footer theme toggle — dark is the default; the choice persists. */
import { Moon, Sun } from "lucide-react";
import { usePageTheme } from "@/lib/use-page-theme";

export function ThemeToggle() {
  const theme = usePageTheme();

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
    </button>
  );
}
