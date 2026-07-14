import { registerCustomTheme } from "@pierre/diffs";

export const COLOR_VISION_MODES = ["standard", "protanopia", "deuteranopia", "tritanopia"] as const;
export type ColorVisionMode = (typeof COLOR_VISION_MODES)[number];

export const PIERRE_THEME_IDS = [
  "pierre-light",
  "pierre-dark",
  "pierre-light-protanopia-deuteranopia",
  "pierre-dark-protanopia-deuteranopia",
  "pierre-light-tritanopia",
  "pierre-dark-tritanopia",
] as const;

export type PierreThemeId = (typeof PIERRE_THEME_IDS)[number];

export function isColorVisionMode(value: string): value is ColorVisionMode {
  return COLOR_VISION_MODES.includes(value as ColorVisionMode);
}

export function isPierreTheme(value: string): value is PierreThemeId {
  return PIERRE_THEME_IDS.includes(value as PierreThemeId);
}

export function resolvePierreCodeTheme(pageTheme: "light" | "dark", mode: ColorVisionMode): PierreThemeId {
  if (mode === "tritanopia") return `pierre-${pageTheme}-tritanopia`;
  if (mode === "protanopia" || mode === "deuteranopia") {
    return `pierre-${pageTheme}-protanopia-deuteranopia`;
  }
  return `pierre-${pageTheme}`;
}

export const PIERRE_THEME_LOADERS: Record<PierreThemeId, () => Promise<{ default: unknown }>> = {
  "pierre-light": () => import("@pierre/theme/pierre-light"),
  "pierre-dark": () => import("@pierre/theme/pierre-dark"),
  "pierre-light-protanopia-deuteranopia": () => import("@pierre/theme/pierre-light-protanopia-deuteranopia"),
  "pierre-dark-protanopia-deuteranopia": () => import("@pierre/theme/pierre-dark-protanopia-deuteranopia"),
  "pierre-light-tritanopia": () => import("@pierre/theme/pierre-light-tritanopia"),
  "pierre-dark-tritanopia": () => import("@pierre/theme/pierre-dark-tritanopia"),
};

let registered = false;

/** Register Pierre's accessible variants with Diffs once per runtime. */
export function registerPierreDiffThemes(): void {
  if (registered) return;
  for (const [id, loader] of Object.entries(PIERRE_THEME_LOADERS)) {
    registerCustomTheme(id, loader as never);
  }
  registered = true;
}
