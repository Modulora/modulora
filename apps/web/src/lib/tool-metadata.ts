import { normalizeDomain } from "./domains";
import { storeImage } from "./media";
import { extractToolMetadata, isPrivateOrReservedIp, type ToolMetadata } from "./tool-metadata-core";

const MAX_HTML_BYTES = 512 * 1024;

async function assertPublicHostname(hostname: string): Promise<void> {
  const queries = ["A", "AAAA"].map(async (type) => {
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return [] as string[];
    const body = await response.json() as { Answer?: { data?: string; type?: number }[] };
    const expectedType = type === "A" ? 1 : 28;
    return (body.Answer ?? []).filter((answer) => answer.type === expectedType).map((answer) => answer.data ?? "").filter(Boolean);
  });
  const addresses = (await Promise.all(queries)).flat();
  if (addresses.length === 0 || addresses.some(isPrivateOrReservedIp)) throw new Error("The site must resolve only to public internet addresses.");
}

async function readBoundedText(response: Response): Promise<string> {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_HTML_BYTES) throw new Error("The site page is too large to inspect.");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) throw new Error("The site page is too large to inspect.");
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

async function readBoundedBytes(response: Response, maximum: number): Promise<Uint8Array> {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > maximum) throw new Error("The fetched asset is too large.");
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) { await reader.cancel(); throw new Error("The fetched asset is too large."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function fetchVerifiedPage(inputUrl: string, verifiedDomain: string): Promise<{ url: string; html: string }> {
  let current = new URL(inputUrl);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    if (current.protocol !== "https:" || normalizeDomain(current.hostname) !== verifiedDomain) {
      throw new Error("The site URL and every redirect must stay on the verified HTTPS domain.");
    }
    await assertPublicHostname(current.hostname);
    const response = await fetch(current, {
      redirect: "manual",
      headers: { accept: "text/html,application/xhtml+xml", "user-agent": "ModuloraMetadataBot/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The site returned an invalid redirect.");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`The site returned HTTP ${response.status}.`);
    if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) throw new Error("The site did not return HTML.");
    return { url: current.toString(), html: await readBoundedText(response) };
  }
  throw new Error("The site redirected too many times.");
}

async function mirrorOgImage(imageUrl: string | null, userId: string): Promise<string | null> {
  if (!imageUrl) return null;
  const url = new URL(imageUrl);
  await assertPublicHostname(url.hostname);
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return null;
  const type = (response.headers.get("content-type") ?? "").split(";")[0] ?? "";
  if (!["image/png", "image/jpeg", "image/webp"].includes(type)) return null;
  let bytes: Uint8Array;
  try { bytes = await readBoundedBytes(response, 2 * 1024 * 1024); }
  catch { return null; }
  const ownedBytes = new Uint8Array(bytes);
  const result = await storeImage(`tool-previews/${userId}`, new File([ownedBytes.buffer], "og-image", { type }));
  return result.ok ? result.url ?? null : null;
}

export async function fetchToolMetadata(inputUrl: string, verifiedDomain: string, userId: string, options: { mirrorImage?: boolean } = { mirrorImage: true }): Promise<ToolMetadata & { canonicalUrl: string }> {
  const page = await fetchVerifiedPage(inputUrl, verifiedDomain);
  const metadata = extractToolMetadata(page.html, page.url);
  return { ...metadata, imageUrl: options.mirrorImage === false ? metadata.imageUrl : await mirrorOgImage(metadata.imageUrl, userId), canonicalUrl: page.url };
}
