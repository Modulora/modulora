import { describe, expect, it } from "vitest";

import { isOwnedProfileBackgroundImage, isProfileBackgroundOverlay, isProfileBackgroundOverlayOpacity, isProfileBackgroundPosition, parseTweakcnTheme, serializeTweakcnTheme, validateProfileCustomizationInput } from "../src/lib/profile-theme";

const ACCESSIBLE_THEME = `:root {
  --background: oklch(0.98 0 0);
  --foreground: oklch(0.18 0 0);
  --card: #ffffff;
  --card-foreground: #222222;
  --radius: 0.75rem;
  --font-sans: DM Sans;
}
.dark {
  --background: oklch(0.15 0 0);
  --foreground: oklch(0.96 0 0);
  --card: #202020;
  --card-foreground: #f5f5f5;
}`;

describe("tweakcn profile themes", () => {
  it("extracts only supported light and dark profile variables", () => {
    const result = parseTweakcnTheme(ACCESSIBLE_THEME);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.theme.light).toMatchObject({ background: "oklch(0.98 0 0)", radius: "0.75rem" });
    expect(result.theme.dark.background).toBe("oklch(0.15 0 0)");
    expect(result.theme.ignored).toContain("font-sans");
  });

  it("ignores tweakcn boilerplate while rejecting URLs and low-contrast text pairs", () => {
    expect(parseTweakcnTheme('@import "tailwindcss"; :root { --background: #fff; --foreground: #111; } @theme inline { --color-background: var(--background); }').ok).toBe(true);
    expect(parseTweakcnTheme(':root { --background: url("https://evil.example/image"); --foreground: #111; }').ok).toBe(false);
    const lowContrast = parseTweakcnTheme(":root { --background: #ffffff; --foreground: #eeeeee; }");
    expect(lowContrast).toMatchObject({ ok: false });
  });

  it("accepts supporting tweakcn token pairs at 3:1", () => {
    const result = parseTweakcnTheme(":root { --background: #ffffff; --foreground: #111111; --muted: #ffffff; --muted-foreground: #767676; }");
    expect(result.ok).toBe(true);
  });

  it("serializes sanitized maps back into editable theme CSS", () => {
    const result = parseTweakcnTheme(ACCESSIBLE_THEME);
    if (!result.ok) throw new Error(result.error);
    const serialized = serializeTweakcnTheme(result.theme.light, result.theme.dark);
    expect(serialized).toContain(":root {");
    expect(serialized).toContain(".dark {");
    expect(serialized).not.toContain("--font-sans");
  });

  it("allows an empty paste to restore the default profile theme", () => {
    expect(parseTweakcnTheme("")).toEqual({ ok: true, theme: { light: {}, dark: {}, ignored: [] } });
  });

  it("fails closed for non-Plus mutation attempts and unknown fonts", () => {
    expect(validateProfileCustomizationInput({ isPlus: false, font: "inter", themeCss: "" })).toMatchObject({ ok: false });
    expect(validateProfileCustomizationInput({ isPlus: true, font: "untrusted-font", themeCss: "" })).toMatchObject({ ok: false });
  });

  it("accepts only an owned immutable profile-background path", () => {
    expect(isOwnedProfileBackgroundImage("/i/profile-backgrounds/user-1/550e8400-e29b-41d4-a716-446655440000.webp", "user-1")).toBe(true);
    expect(isOwnedProfileBackgroundImage("/i/profile-backgrounds/user-2/550e8400-e29b-41d4-a716-446655440000.webp", "user-1")).toBe(false);
    expect(isOwnedProfileBackgroundImage("/i/profile-backgrounds/user-1/../user-2/image.webp", "user-1")).toBe(false);
    expect(isOwnedProfileBackgroundImage("https://tracker.example/background.webp", "user-1")).toBe(false);
  });

  it("bounds profile background overlay controls", () => {
    expect(isProfileBackgroundOverlay("dark")).toBe(true);
    expect(isProfileBackgroundOverlay("light")).toBe(true);
    expect(isProfileBackgroundOverlay("multiply")).toBe(false);
    expect(isProfileBackgroundOverlayOpacity(0)).toBe(true);
    expect(isProfileBackgroundOverlayOpacity(80)).toBe(true);
    expect(isProfileBackgroundOverlayOpacity(81)).toBe(false);
    expect(isProfileBackgroundOverlayOpacity(20.5)).toBe(false);
    expect(isProfileBackgroundPosition(0)).toBe(true);
    expect(isProfileBackgroundPosition(100)).toBe(true);
    expect(isProfileBackgroundPosition(-1)).toBe(false);
    expect(isProfileBackgroundPosition(101)).toBe(false);
  });
});
