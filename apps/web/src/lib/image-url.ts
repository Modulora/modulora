/** Client-safe guard: avoid requesting clearly non-routable avatar URLs. */
export function isRenderableImageUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return url.hostname === "localhost" || url.hostname.includes(".");
  } catch {
    return false;
  }
}
