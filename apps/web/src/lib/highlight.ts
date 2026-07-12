/**
 * Shiki highlighter for published component source.
 *
 * Uses the fine-grained core with the JavaScript RegExp engine so it runs on
 * the Cloudflare Worker without WASM. Highlighting happens in route loaders
 * (server side); the rendered HTML is streamed to the client.
 */
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const THEME = "github-dark-default";

let highlighterPromise: Promise<HighlighterCore> | null = null;

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

export async function highlight(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang,
    theme: THEME,
    colorReplacements: { "#0d1117": "transparent" },
  });
}
