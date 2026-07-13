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

/**
 * Component type — the shadcn-style vocabulary of what the thing *is*
 * (Button, Dialog, Data Table…), orthogonal to category (what it's for).
 * Optional on publish; filterable in the catalog.
 */
export const COMPONENT_TYPES = [
  { id: "accordion", label: "Accordion" },
  { id: "alert", label: "Alert" },
  { id: "alert-dialog", label: "Alert Dialog" },
  { id: "aspect-ratio", label: "Aspect Ratio" },
  { id: "attachment", label: "Attachment" },
  { id: "avatar", label: "Avatar" },
  { id: "badge", label: "Badge" },
  { id: "breadcrumb", label: "Breadcrumb" },
  { id: "bubble", label: "Bubble" },
  { id: "button", label: "Button" },
  { id: "button-group", label: "Button Group" },
  { id: "calendar", label: "Calendar" },
  { id: "card", label: "Card" },
  { id: "carousel", label: "Carousel" },
  { id: "chart", label: "Chart" },
  { id: "checkbox", label: "Checkbox" },
  { id: "collapsible", label: "Collapsible" },
  { id: "combobox", label: "Combobox" },
  { id: "command", label: "Command" },
  { id: "context-menu", label: "Context Menu" },
  { id: "data-table", label: "Data Table" },
  { id: "date-picker", label: "Date Picker" },
  { id: "dialog", label: "Dialog" },
  { id: "direction", label: "Direction" },
  { id: "drawer", label: "Drawer" },
  { id: "dropdown-menu", label: "Dropdown Menu" },
  { id: "empty", label: "Empty" },
  { id: "field", label: "Field" },
  { id: "hover-card", label: "Hover Card" },
  { id: "input", label: "Input" },
  { id: "input-group", label: "Input Group" },
  { id: "input-otp", label: "Input OTP" },
  { id: "item", label: "Item" },
  { id: "kbd", label: "Kbd" },
  { id: "label", label: "Label" },
  { id: "marker", label: "Marker" },
  { id: "menubar", label: "Menubar" },
  { id: "message", label: "Message" },
  { id: "message-scroller", label: "Message Scroller" },
  { id: "native-select", label: "Native Select" },
  { id: "navigation-menu", label: "Navigation Menu" },
  { id: "pagination", label: "Pagination" },
  { id: "popover", label: "Popover" },
  { id: "progress", label: "Progress" },
  { id: "radio-group", label: "Radio Group" },
  { id: "resizable", label: "Resizable" },
  { id: "scroll-area", label: "Scroll Area" },
  { id: "select", label: "Select" },
  { id: "separator", label: "Separator" },
  { id: "sheet", label: "Sheet" },
  { id: "sidebar", label: "Sidebar" },
  { id: "skeleton", label: "Skeleton" },
  { id: "slider", label: "Slider" },
  { id: "sonner", label: "Sonner" },
  { id: "spinner", label: "Spinner" },
  { id: "switch", label: "Switch" },
  { id: "table", label: "Table" },
  { id: "tabs", label: "Tabs" },
  { id: "textarea", label: "Textarea" },
  { id: "toast", label: "Toast" },
  { id: "toggle", label: "Toggle" },
  { id: "toggle-group", label: "Toggle Group" },
  { id: "tooltip", label: "Tooltip" },
  { id: "typography", label: "Typography" },
  { id: "other", label: "Other" },
] as const;

export type ComponentTypeId = (typeof COMPONENT_TYPES)[number]["id"];

export function isComponentTypeId(id: string): id is ComponentTypeId {
  return COMPONENT_TYPES.some((t) => t.id === id);
}

export function componentTypeLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  return COMPONENT_TYPES.find((t) => t.id === id)?.label ?? id;
}
