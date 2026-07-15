export interface ToolMetadata {
  title: string;
  description: string;
  imageUrl: string | null;
}

export function isPrivateOrReservedIp(value: string): boolean {
  const ip = value.trim().toLowerCase();
  if (ip === "::1" || ip === "::" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("ff") || ip.startsWith("2001:db8:") || ip.startsWith("2001:10:")) return true;
  if (ip.startsWith("::ffff:")) return isPrivateOrReservedIp(ip.slice(7));
  if (ip.includes(":")) return false;
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const a = parts[0]!;
  const b = parts[1]!;
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0);
}

function decodeHtml(value: string): string {
  return value
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&#39;|&apos;/gi, "'")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&gt;/gi, ">")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function extractToolMetadata(html: string, pageUrl: string): ToolMetadata {
  const metas = [...html.matchAll(/<meta\s+[^>]*>/gi)].map((match) => match[0]);
  const values = new Map<string, string>();
  for (const tag of metas) {
    const key = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (key && content && !values.has(key)) values.set(key, decodeHtml(content));
  }
  const titleTag = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const title = values.get("og:title") || values.get("twitter:title") || titleTag;
  const description = values.get("og:description") || values.get("description") || values.get("twitter:description") || "";
  const rawImage = values.get("og:image") || values.get("twitter:image") || null;
  let imageUrl: string | null = null;
  if (rawImage) {
    try {
      const resolved = new URL(rawImage, pageUrl);
      if (resolved.protocol === "https:") imageUrl = resolved.toString();
    } catch {
      imageUrl = null;
    }
  }
  return { title: title.slice(0, 120), description: description.slice(0, 500), imageUrl };
}
