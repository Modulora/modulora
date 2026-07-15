import { describe, expect, it } from "vitest";

import { isToolPricing, normalizeToolShowcaseImages } from "../src/lib/tool-showcase";

describe("tool showcase input", () => {
  it("accepts 1–6 unique images uploaded by the current user", () => {
    expect(normalizeToolShowcaseImages([
      "/i/tool-showcases/user-1/00000000-0000-4000-8000-000000000001.webp",
      "/i/tool-showcases/user-1/00000000-0000-4000-8000-000000000002.webp",
      "/i/tool-showcases/user-1/00000000-0000-4000-8000-000000000001.webp",
    ], "user-1")).toEqual([
      "/i/tool-showcases/user-1/00000000-0000-4000-8000-000000000001.webp",
      "/i/tool-showcases/user-1/00000000-0000-4000-8000-000000000002.webp",
    ]);
  });

  it("rejects missing, excessive, and other-user images", () => {
    expect(normalizeToolShowcaseImages([], "user-1")).toBeNull();
    expect(normalizeToolShowcaseImages(Array.from({ length: 7 }, (_, index) => `/i/tool-showcases/user-1/00000000-0000-4000-8000-${String(index).padStart(12, "0")}.webp`), "user-1")).toBeNull();
    expect(normalizeToolShowcaseImages(["/i/tool-showcases/user-2/00000000-0000-4000-8000-000000000001.webp"], "user-1")).toBeNull();
    expect(normalizeToolShowcaseImages(["/i/tool-showcases/user-1/../user-2/00000000-0000-4000-8000-000000000001.webp"], "user-1")).toBeNull();
  });

  it("accepts only supported external pricing labels", () => {
    expect(["free", "freemium", "paid"].every(isToolPricing)).toBe(true);
    expect(isToolPricing("enterprise")).toBe(false);
  });
});
