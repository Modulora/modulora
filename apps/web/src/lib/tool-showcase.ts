export const TOOL_PRICING = ["free", "freemium", "paid"] as const;
export type ToolPricing = (typeof TOOL_PRICING)[number];
export const MAX_TOOL_SHOWCASE_IMAGES = 6;

export function normalizeToolShowcaseImages(value: unknown, userId: string): string[] | null {
  if (!Array.isArray(value)) return null;
  const urls = [...new Set(value.map((item) => String(item ?? "").trim()).filter(Boolean))];
  const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ownedImage = new RegExp(`^/i/tool-showcases/${escapedUserId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:png|jpg|webp)$`, "i");
  if (urls.length < 1 || urls.length > MAX_TOOL_SHOWCASE_IMAGES || urls.some((url) => !ownedImage.test(url))) return null;
  return urls;
}

export function isToolPricing(value: unknown): value is ToolPricing {
  return TOOL_PRICING.includes(value as ToolPricing);
}
