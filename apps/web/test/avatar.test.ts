import { describe, expect, it } from "vitest";

import { calculateAvatarCrop, hasValidImageSignature, isInternalAvatarPath, MAX_AVATAR_BYTES, validateAvatarFile } from "../src/lib/avatar";

describe("avatar file validation", () => {
  it("accepts supported images up to the size limit", () => {
    expect(validateAvatarFile({ type: "image/png", size: MAX_AVATAR_BYTES })).toBeNull();
    expect(validateAvatarFile({ type: "image/webp", size: 24_000 })).toBeNull();
  });

  it("rejects unsupported image formats", () => {
    expect(validateAvatarFile({ type: "image/svg+xml", size: 1_000 })).toBe("Use a PNG, JPEG, WebP, or GIF.");
  });

  it("rejects images larger than two megabytes", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: MAX_AVATAR_BYTES + 1 })).toBe("Image must be under 2 MB.");
  });
});

describe("avatar crop geometry", () => {
  it("cover-crops a landscape image without exposing empty canvas", () => {
    expect(calculateAvatarCrop(800, 400, 512, 1, 0, 0)).toEqual({
      x: -256,
      y: 0,
      width: 1024,
      height: 512,
    });
  });

  it("keeps extreme offsets within the covered image", () => {
    const left = calculateAvatarCrop(800, 400, 512, 1, -100, 0);
    const right = calculateAvatarCrop(800, 400, 512, 1, 100, 0);
    expect(left.x).toBe(-512);
    expect(right.x).toBe(0);
  });
});

describe("avatar file signatures", () => {
  it("accepts matching PNG and WebP headers", () => {
    expect(hasValidImageSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(hasValidImageSignature(new TextEncoder().encode("RIFF0000WEBP"), "image/webp")).toBe(true);
  });

  it("rejects a file whose bytes do not match its declared format", () => {
    expect(hasValidImageSignature(new TextEncoder().encode("<script>"), "image/png")).toBe(false);
  });
});

describe("internal avatar paths", () => {
  it("accepts immutable avatar media paths", () => {
    expect(isInternalAvatarPath("/i/avatars/user_123/4afb4c16-2966-403e-84aa-1e2a3b4c5d6e.webp")).toBe(true);
  });

  it("rejects unrelated and traversing relative paths", () => {
    expect(isInternalAvatarPath("/i/previews/file.webp")).toBe(false);
    expect(isInternalAvatarPath("/i/avatars/user/../secret.webp")).toBe(false);
  });
});
