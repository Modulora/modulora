/**
 * Canonical component categories (Alpha). Mirrors the shared taxonomy tracked
 * in @modulora/spec (#7); web + CLI publish must agree on these IDs.
 */
export const CATEGORIES = [
  { id: "layout", label: "Layout" },
  { id: "navigation", label: "Navigation" },
  { id: "forms", label: "Forms & Inputs" },
  { id: "data-display", label: "Data Display" },
  { id: "date-time", label: "Date & Time" },
  { id: "feedback", label: "Feedback & Overlays" },
  { id: "media", label: "Media" },
  { id: "commerce", label: "Commerce" },
  { id: "marketing", label: "Marketing" },
  { id: "charts", label: "Charts" },
  { id: "ai", label: "AI & Chat" },
  { id: "utilities", label: "Utilities" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORY_IDS.includes(value as CategoryId);
}

export function categoryLabel(id: string): string {
  return CATEGORIES.find((category) => category.id === id)?.label ?? id;
}
