/**
 * Shiki highlighter for published component source.
 *
 * Uses the fine-grained core with the JavaScript RegExp engine so it runs on
 * the Cloudflare Worker without WASM. Highlighting happens in route loaders
 * (server side); the rendered HTML is streamed to the client. Every Shiki
 * Pierre Light/Dark and their color-vision variants are the only supported
 * code themes. The palette follows app appearance + accessibility settings.
 */
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import pierreDark from "@pierre/theme/pierre-dark";
import { PIERRE_THEME_LOADERS, isPierreTheme } from "./pierre-theme";

export const DEFAULT_EDITOR_THEME = "pierre-dark";

export function isEditorTheme(value: string): boolean {
  return isPierreTheme(value);
}

let highlighterPromise: Promise<HighlighterCore> | null = null;
const loadedThemes = new Set<string>([DEFAULT_EDITOR_THEME]);

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [pierreDark as never],
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
  const loader = PIERRE_THEME_LOADERS[theme as keyof typeof PIERRE_THEME_LOADERS];
  if (!loader) return;
  const loaded = await loader();
  await highlighter.loadTheme((loaded as { default?: never }).default ?? (loaded as never));
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
