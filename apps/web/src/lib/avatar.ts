export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const ACCEPTED_AVATAR_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_AVATAR_TYPES.has(file.type)) return "Use a PNG, JPEG, WebP, or GIF.";
  if (file.size > MAX_AVATAR_BYTES) return "Image must be under 2 MB.";
  return null;
}

export function isInternalAvatarPath(value: string): boolean {
  return /^\/i\/avatars\/[A-Za-z0-9_-]+\/[A-Fa-f0-9-]+\.(png|jpg|webp|gif)$/.test(value);
}

export function calculateAvatarCrop(
  sourceWidth: number,
  sourceHeight: number,
  size: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const scale = Math.max(size / sourceWidth, size / sourceHeight) * zoom;
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const overflowX = Math.max(0, width - size);
  const overflowY = Math.max(0, height - size);
  return {
    x: (size - width) / 2 + (offsetX / 100) * (overflowX / 2),
    y: (size - height) / 2 + (offsetY / 100) * (overflowY / 2),
    width,
    height,
  };
}

export function hasValidImageSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  }
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/gif") {
    const header = String.fromCharCode(...bytes.slice(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}
