/**
 * R2-backed media storage for uploaded assets (avatars now; preview images
 * later). The MEDIA binding is declared in wrangler.jsonc; local dev uses the
 * Cloudflare Vite plugin's simulated R2 so uploads work without a real bucket.
 */
import { env } from "cloudflare:workers";

export interface MediaEnv {
  MEDIA?: R2Bucket;
}

export function getMediaBucket(): R2Bucket | null {
  return (env as MediaEnv).MEDIA ?? null;
}

const ALLOWED = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/** Store an uploaded image under a namespaced key and return its serve URL. */
export async function storeImage(
  prefix: string,
  file: File,
): Promise<UploadResult> {
  const bucket = getMediaBucket();
  if (!bucket) return { ok: false, error: "Media storage is not configured." };

  const extension = ALLOWED.get(file.type);
  if (!extension) return { ok: false, error: "Use a PNG, JPEG, WebP, or GIF." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Image must be under 2 MB." };
  }

  const key = `${prefix}/${crypto.randomUUID()}.${extension}`;
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
  });
  return { ok: true, url: `/i/${key}` };
}
