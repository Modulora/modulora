/**
 * Generate src/lib/theme-palettes.generated.ts from Shiki's bundled themes.
 * Extracts exact preview colors (bg/fg + representative token colors) for every
 * theme so the settings picker can render accurate mini-previews without loading
 * full theme JSON on the client.
 *
 *   node scripts/gen-theme-palettes.mjs
 */
import { bundledThemes, bundledThemesInfo } from "shiki";
import { writeFileSync } from "node:fs";

function pick(tokenColors, needles) {
  for (const needle of needles) {
    for (const tc of tokenColors ?? []) {
      const scope = Array.isArray(tc.scope) ? tc.scope.join(" ") : (tc.scope ?? "");
      if (scope.includes(needle) && tc.settings?.foreground) return tc.settings.foreground;
    }
  }
  return null;
}

const out = [];
for (const info of bundledThemesInfo) {
  const mod = await bundledThemes[info.id]();
  const t = mod.default ?? mod;
  const c = t.colors ?? {};
  const fg = c["editor.foreground"] ?? t.fg ?? "#c9d1d9";
  const bg = c["editor.background"] ?? t.bg ?? "#0d1117";
  out.push({
    id: info.id,
    name: info.displayName ?? info.id,
    type: info.type ?? t.type ?? "dark",
    bg,
    fg,
    keyword: pick(t.tokenColors, ["keyword", "storage"]) ?? fg,
    string: pick(t.tokenColors, ["string"]) ?? fg,
    func: pick(t.tokenColors, ["entity.name.function", "support.function"]) ?? fg,
    comment: pick(t.tokenColors, ["comment"]) ?? fg,
    variable: pick(t.tokenColors, ["variable", "entity.name"]) ?? fg,
    number: pick(t.tokenColors, ["constant.numeric", "constant"]) ?? fg,
  });
}

const header =
  "// AUTO-GENERATED from Shiki bundled themes. Do not edit by hand.\n" +
  "// Regenerate: node scripts/gen-theme-palettes.mjs\n\n";
const iface =
  "export interface ThemePalette {\n  id: string;\n  name: string;\n  type: \"light\" | \"dark\";\n  bg: string;\n  fg: string;\n  keyword: string;\n  string: string;\n  func: string;\n  comment: string;\n  variable: string;\n  number: string;\n}\n\n";
writeFileSync(
  "src/lib/theme-palettes.generated.ts",
  header + iface + "export const THEME_PALETTES: ThemePalette[] = " + JSON.stringify(out, null, 2) + ";\n",
);
console.log("wrote", out.length, "palettes");
