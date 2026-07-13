/**
 * Shiki highlighter for published component source.
 *
 * Uses the fine-grained core with the JavaScript RegExp engine so it runs on
 * the Cloudflare Worker without WASM. Highlighting happens in route loaders
 * (server side); the rendered HTML is streamed to the client. Every Shiki
 * bundled theme is selectable in settings; themes load lazily on first use.
 */
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { bundledThemes, bundledThemesInfo } from "shiki/themes";
import { THEME_PALETTES } from "./theme-palettes.generated";

export const DEFAULT_EDITOR_THEME = "github-dark-default";

/** All Shiki bundled themes, selectable in settings. */
export const EDITOR_THEMES = bundledThemesInfo.map((info) => ({
  id: info.id,
  label: info.displayName ?? info.id,
  type: info.type,
}));

const THEME_IDS = new Set(EDITOR_THEMES.map((theme) => theme.id));

export function isEditorTheme(value: string): boolean {
  return THEME_IDS.has(value);
}

/** Exact preview colors per theme (bg/fg + token colors), for the picker. */
export { THEME_PALETTES };

let highlighterPromise: Promise<HighlighterCore> | null = null;
const loadedThemes = new Set<string>([DEFAULT_EDITOR_THEME]);

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import("shiki/themes/github-dark-default.mjs")],
      langs: [
        import("shiki/langs/tsx.mjs"),
        import("shiki/langs/typescript.mjs"),
        import("shiki/langs/css.mjs"),
        import("shiki/langs/json.mjs"),
      ],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

const EXTENSION_LANG: Record<string, string> = {
  tsx: "tsx",
  ts: "typescript",
  jsx: "tsx",
  js: "typescript",
  css: "css",
  json: "json",
};

export function langForPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_LANG[extension] ?? "tsx";
}

async function ensureTheme(highlighter: HighlighterCore, theme: string) {
  if (loadedThemes.has(theme) || !isEditorTheme(theme)) return;
  const loader = bundledThemes[theme as keyof typeof bundledThemes];
  if (!loader) return;
  await highlighter.loadTheme(await loader());
  loadedThemes.add(theme);
}

export async function highlight(
  code: string,
  lang: string,
  theme: string = DEFAULT_EDITOR_THEME,
): Promise<string> {
  const highlighter = await getHighlighter();
  const resolved = isEditorTheme(theme) ? theme : DEFAULT_EDITOR_THEME;
  await ensureTheme(highlighter, resolved);
  return highlighter.codeToHtml(code, { lang, theme: resolved });
}
