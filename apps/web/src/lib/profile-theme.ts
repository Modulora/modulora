export const PROFILE_FONTS = [
  { id: "inter", label: "Inter", family: '"Inter Variable", sans-serif', googleFamily: null, localFile: null, weight: null },
  { id: "geist", label: "Geist", family: '"Geist", sans-serif', googleFamily: "Geist", localFile: null, weight: null },
  { id: "dm-sans", label: "DM Sans", family: '"DM Sans", sans-serif', googleFamily: "DM+Sans", localFile: null, weight: null },
  { id: "manrope", label: "Manrope", family: '"Manrope", sans-serif', googleFamily: "Manrope", localFile: null, weight: null },
  { id: "space-grotesk", label: "Space Grotesk", family: '"Space Grotesk", sans-serif', googleFamily: "Space+Grotesk", localFile: null, weight: null },
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans", family: '"Plus Jakarta Sans", sans-serif', googleFamily: "Plus+Jakarta+Sans", localFile: null, weight: null },
  { id: "lora", label: "Lora", family: '"Lora", serif', googleFamily: "Lora", localFile: null, weight: null },
  { id: "geist-pixel-square", label: "Geist Pixel Square", family: '"Geist Pixel Square", monospace', googleFamily: null, localFile: "/fonts/geist/GeistPixel-Square.woff2", weight: "500" },
  { id: "geist-pixel-grid", label: "Geist Pixel Grid", family: '"Geist Pixel Grid", monospace', googleFamily: null, localFile: "/fonts/geist/GeistPixel-Grid.woff2", weight: "500" },
  { id: "geist-pixel-circle", label: "Geist Pixel Circle", family: '"Geist Pixel Circle", monospace', googleFamily: null, localFile: "/fonts/geist/GeistPixel-Circle.woff2", weight: "500" },
  { id: "geist-pixel-triangle", label: "Geist Pixel Triangle", family: '"Geist Pixel Triangle", monospace', googleFamily: null, localFile: "/fonts/geist/GeistPixel-Triangle.woff2", weight: "500" },
  { id: "geist-pixel-line", label: "Geist Pixel Line", family: '"Geist Pixel Line", monospace', googleFamily: null, localFile: "/fonts/geist/GeistPixel-Line.woff2", weight: "500" },
] as const;

export type ProfileFontId = (typeof PROFILE_FONTS)[number]["id"];
export type ProfileThemeVariables = Record<string, string>;
export type ProfileBackgroundOverlay = "dark" | "light";

const COLOR_TOKENS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground",
  "accent", "accent-foreground", "destructive", "destructive-foreground", "border", "input", "ring",
] as const;
const SHADOW_TOKENS = ["shadow-2xs", "shadow-xs", "shadow-sm", "shadow", "shadow-md", "shadow-lg", "shadow-xl", "shadow-2xl"] as const;
const ALLOWED_TOKENS = new Set<string>([...COLOR_TOKENS, ...SHADOW_TOKENS, "radius", "tracking-normal"]);
const TEXT_PAIRS = [
  ["background", "foreground", 4.5],
  ["card", "card-foreground", 4.5],
  ["popover", "popover-foreground", 4.5],
  ["primary", "primary-foreground", 3],
  ["secondary", "secondary-foreground", 3],
  ["muted", "muted-foreground", 3],
  ["accent", "accent-foreground", 3],
] as const;

export interface ParsedProfileTheme {
  light: ProfileThemeVariables;
  dark: ProfileThemeVariables;
  ignored: string[];
}

export function validateProfileCustomizationInput(input: { isPlus: boolean; font: string; themeCss: string }):
  | { ok: true; font: ProfileFontId; theme: ParsedProfileTheme }
  | { ok: false; error: string } {
  if (!input.isPlus) return { ok: false, error: "Editing public profile themes requires active Modulora Plus." };
  if (!isProfileFontId(input.font)) return { ok: false, error: "Choose a supported profile font." };
  const parsed = parseTweakcnTheme(input.themeCss);
  if (!parsed.ok) return parsed;
  return { ok: true, font: input.font, theme: parsed.theme };
}

export function isProfileFontId(value: string): value is ProfileFontId {
  return PROFILE_FONTS.some((font) => font.id === value);
}

export function isOwnedProfileBackgroundImage(value: string, userId: string): boolean {
  const prefix = `/i/profile-backgrounds/${userId}/`;
  if (!value.startsWith(prefix)) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|webp)$/i.test(value.slice(prefix.length));
}

export function isProfileBackgroundOverlay(value: string): value is ProfileBackgroundOverlay {
  return value === "dark" || value === "light";
}

export function isProfileBackgroundOverlayOpacity(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 80;
}

export function isProfileBackgroundPosition(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

export function profileFont(value: string) {
  return PROFILE_FONTS.find((font) => font.id === value) ?? PROFILE_FONTS[0];
}

export function parseTweakcnTheme(css: string): { ok: true; theme: ParsedProfileTheme } | { ok: false; error: string } {
  const source = css.trim();
  if (!source) return { ok: true, theme: { light: {}, dark: {}, ignored: [] } };
  if (source.length > 16_000) return { ok: false, error: "Theme CSS must be 16 KB or smaller." };
  if (/url\s*\(|expression\s*\(|javascript:/i.test(source)) {
    return { ok: false, error: "External URLs and executable CSS values are not allowed." };
  }
  const rootBlock = blockFor(source, /:root\s*\{/i);
  if (rootBlock == null) return { ok: false, error: "Paste a tweakcn theme containing a :root block." };
  const darkBlock = blockFor(source, /(?:\.dark|\[data-theme=["']dark["']\])\s*\{/i) ?? "";
  const ignored = new Set<string>();
  const light = parseDeclarations(rootBlock, ignored);
  const dark = parseDeclarations(darkBlock, ignored);
  if (Object.keys(light).length === 0) return { ok: false, error: "No supported profile theme variables were found." };
  for (const [mode, variables] of [["Light", light], ["Dark", dark]] as const) {
    const contrastError = validateContrast(mode, variables);
    if (contrastError) return { ok: false, error: contrastError };
  }
  return { ok: true, theme: { light, dark, ignored: [...ignored].sort() } };
}

export function serializeTweakcnTheme(light: ProfileThemeVariables, dark: ProfileThemeVariables): string {
  if (Object.keys(light).length === 0 && Object.keys(dark).length === 0) return "";
  return `${serializeBlock(":root", light)}\n\n${serializeBlock(".dark", dark)}`.trim();
}

export function profileThemeDeclarations(variables: ProfileThemeVariables): string {
  return Object.entries(variables)
    .filter(([name, value]) => ALLOWED_TOKENS.has(name) && validTokenValue(name, value))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `--${name}:${value};`)
    .join("");
}

function blockFor(source: string, selector: RegExp): string | null {
  const match = selector.exec(source);
  if (!match) return null;
  const start = source.indexOf("{", match.index) + 1;
  const end = source.indexOf("}", start);
  return end >= start ? source.slice(start, end) : null;
}

function parseDeclarations(block: string, ignored: Set<string>): ProfileThemeVariables {
  const result: ProfileThemeVariables = {};
  for (const match of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;{}]+)\s*;?/gi)) {
    const name = match[1]!.toLowerCase();
    const value = match[2]!.trim();
    if (!ALLOWED_TOKENS.has(name)) {
      ignored.add(name);
      continue;
    }
    if (!validTokenValue(name, value)) continue;
    result[name] = value;
  }
  return result;
}

function validTokenValue(name: string, value: string): boolean {
  if (value.length > 120 || /[;{}]|var\s*\(|url\s*\(/i.test(value)) return false;
  if (name === "radius") return /^\d+(?:\.\d+)?(?:px|rem|em)$/.test(value);
  if (name === "tracking-normal") return /^-?\d+(?:\.\d+)?em$/.test(value);
  if (SHADOW_TOKENS.includes(name as (typeof SHADOW_TOKENS)[number])) {
    return /^[0-9a-zA-Z#().,%+\-/\s]+$/.test(value);
  }
  return /^(?:#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\([0-9a-zA-Z.,%+\-/\s]+\)|transparent)$/i.test(value);
}

function validateContrast(mode: string, variables: ProfileThemeVariables): string | null {
  for (const [backgroundName, foregroundName, minimum] of TEXT_PAIRS) {
    const background = variables[backgroundName];
    const foreground = variables[foregroundName];
    if (!background || !foreground) continue;
    const ratio = contrastRatio(background, foreground);
    if (ratio == null) return `${mode} ${backgroundName} colors use an unsupported format.`;
    if (ratio < minimum) return `${mode} ${foregroundName} contrast is ${ratio.toFixed(2)}:1; this profile token requires at least ${minimum.toFixed(1)}:1.`;
  }
  return null;
}

function contrastRatio(first: string, second: string): number | null {
  const a = luminance(first);
  const b = luminance(second);
  if (a == null || b == null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function luminance(value: string): number | null {
  const rgb = parseColor(value);
  if (!rgb) return null;
  return 0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2]);
}

function parseColor(value: string): [number, number, number] | null {
  const input = value.trim().toLowerCase();
  if (input.startsWith("#")) return parseHex(input);
  const fn = /^(rgb|rgba|hsl|hsla|oklch)\((.*)\)$/.exec(input);
  if (!fn) return null;
  if (fn[1] === "rgb" || fn[1] === "rgba") return parseRgb(fn[2]!);
  if (fn[1] === "hsl" || fn[1] === "hsla") return parseHsl(fn[2]!);
  return parseOklch(fn[2]!);
}

function parseHex(value: string): [number, number, number] | null {
  const hex = value.slice(1);
  if (![3, 4, 6, 8].includes(hex.length)) return null;
  const full = hex.length <= 4 ? hex.slice(0, 3).split("").map((part) => part + part).join("") : hex.slice(0, 6);
  const number = Number.parseInt(full, 16);
  return [((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255];
}

function parseRgb(value: string): [number, number, number] | null {
  const parts = value.replace(/,/g, " ").split(/\s+/).filter(Boolean).slice(0, 3);
  if (parts.length !== 3) return null;
  const numbers = parts.map((part) => part.endsWith("%") ? Number.parseFloat(part) / 100 : Number.parseFloat(part) / 255);
  return numbers.every(Number.isFinite) ? numbers.map(clamp) as [number, number, number] : null;
}

function parseHsl(value: string): [number, number, number] | null {
  const parts = value.replace(/,/g, " ").split(/\s+/).filter(Boolean).slice(0, 3);
  if (parts.length !== 3) return null;
  const h = ((Number.parseFloat(parts[0]!) % 360) + 360) % 360 / 360;
  const s = Number.parseFloat(parts[1]!) / 100;
  const l = Number.parseFloat(parts[2]!) / 100;
  if (![h, s, l].every(Number.isFinite)) return null;
  const hue = (p: number, q: number, t: number) => {
    const n = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (n < 1 / 6) return p + (q - p) * 6 * n;
    if (n < 1 / 2) return q;
    if (n < 2 / 3) return p + (q - p) * (2 / 3 - n) * 6;
    return p;
  };
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)].map(clamp) as [number, number, number];
}

function parseOklch(value: string): [number, number, number] | null {
  const parts = value.split(/[\s,/]+/).filter(Boolean).slice(0, 3);
  if (parts.length !== 3) return null;
  const lightness = parts[0]!.endsWith("%") ? Number.parseFloat(parts[0]!) / 100 : Number.parseFloat(parts[0]!);
  const chroma = Number.parseFloat(parts[1]!);
  const hue = Number.parseFloat(parts[2]!) * Math.PI / 180;
  if (![lightness, chroma, hue].every(Number.isFinite)) return null;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => clamp(linearToSrgb(channel))) as [number, number, number];
}

function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel: number): number {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function serializeBlock(selector: string, variables: ProfileThemeVariables): string {
  const declarations = Object.entries(variables).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `  --${name}: ${value};`).join("\n");
  return `${selector} {\n${declarations}\n}`;
}
