/**
 * The site's current theme, read from the `dark` class on <html>. Previews
 * default to this so they match the page; when a site-wide theme toggle lands,
 * they follow automatically. SSR assumes dark (the current site default).
 */
import { useEffect, useState } from "react";

export function usePageTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
