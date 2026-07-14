/**
 * Build an exact CodeMirror 6 theme from a Shiki bundled theme's own JSON, so
 * the editor matches the highlighted view precisely — no approximate palettes.
 * Editor chrome comes from the theme's `colors`; token colors come from its
 * `tokenColors`, mapped to Lezer highlight tags.
 */
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";
import { PIERRE_THEME_LOADERS, isPierreTheme } from "./pierre-theme";

interface TokenColor {
  scope?: string | string[];
  settings?: { foreground?: string; fontStyle?: string };
}
interface ShikiTheme {
  type?: "light" | "dark";
  colors?: Record<string, string>;
  tokenColors?: TokenColor[];
  fg?: string;
  bg?: string;
}

/** First tokenColor whose scope matches any needle → its settings. */
function match(tokenColors: TokenColor[], needles: string[]) {
  for (const needle of needles) {
    for (const tc of tokenColors) {
      const scope = Array.isArray(tc.scope) ? tc.scope.join(" ") : (tc.scope ?? "");
      if (scope.split(/[\s,]+/).some((s) => s === needle || s.startsWith(needle + "."))) {
        if (tc.settings?.foreground) return tc.settings;
      }
    }
  }
  return undefined;
}

function styleFor(settings: { foreground?: string; fontStyle?: string } | undefined) {
  if (!settings?.foreground) return undefined;
  const out: Record<string, string> = { color: settings.foreground };
  if (settings.fontStyle?.includes("italic")) out.fontStyle = "italic";
  if (settings.fontStyle?.includes("bold")) out.fontWeight = "bold";
  if (settings.fontStyle?.includes("underline")) out.textDecoration = "underline";
  return out;
}

function buildTheme(theme: ShikiTheme): Extension {
  const c = theme.colors ?? {};
  const dark = theme.type !== "light";
  const bg = c["editor.background"] ?? theme.bg ?? (dark ? "#0d1117" : "#ffffff");
  const fg = c["editor.foreground"] ?? theme.fg ?? (dark ? "#c9d1d9" : "#24292e");
  const caret = c["editorCursor.foreground"] ?? fg;
  const selection = c["editor.selectionBackground"] ?? (dark ? "#3a3d41" : "#add6ff");
  const lineHighlight = c["editor.lineHighlightBackground"] ?? "transparent";
  const gutterFg = c["editorLineNumber.foreground"] ?? (dark ? "#6e7681" : "#bbb");
  const gutterActive = c["editorLineNumber.activeForeground"] ?? fg;

  const editorTheme = EditorView.theme(
    {
      "&": { color: fg, backgroundColor: bg, height: "100%" },
      ".cm-scroller": { overflow: "auto" },
      ".cm-content": { caretColor: caret },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: caret },
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        { backgroundColor: selection },
      ".cm-activeLine": { backgroundColor: lineHighlight },
      ".cm-gutters": { backgroundColor: bg, color: gutterFg, border: "none" },
      ".cm-activeLineGutter": { backgroundColor: lineHighlight, color: gutterActive },
    },
    { dark },
  );

  const tc = theme.tokenColors ?? [];
  const styles = [
    { tag: [t.keyword, t.modifier, t.operatorKeyword], scopes: ["keyword", "storage"] },
    { tag: [t.controlKeyword], scopes: ["keyword.control", "keyword"] },
    { tag: [t.definitionKeyword, t.typeName, t.namespace], scopes: ["storage.type", "entity.name.type", "support.type"] },
    { tag: [t.comment, t.lineComment, t.blockComment], scopes: ["comment"] },
    { tag: [t.string, t.special(t.string)], scopes: ["string"] },
    { tag: [t.number, t.integer, t.float], scopes: ["constant.numeric", "constant"] },
    { tag: [t.bool, t.atom, t.constant(t.name)], scopes: ["constant.language", "constant"] },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], scopes: ["entity.name.function", "support.function"] },
    { tag: [t.variableName], scopes: ["variable"] },
    { tag: [t.propertyName], scopes: ["variable.other.property", "meta.object-literal.key", "variable"] },
    { tag: [t.tagName], scopes: ["entity.name.tag"] },
    { tag: [t.attributeName], scopes: ["entity.other.attribute-name"] },
    { tag: [t.className], scopes: ["entity.name.type.class", "support.class"] },
    { tag: [t.operator, t.punctuation], scopes: ["keyword.operator", "punctuation"] },
    { tag: [t.escape], scopes: ["constant.character.escape"] },
    { tag: [t.heading], scopes: ["markup.heading"] },
    { tag: [t.link, t.url], scopes: ["markup.underline.link"] },
  ]
    .map(({ tag, scopes }) => {
      const style = styleFor(match(tc, scopes));
      return style ? { tag, ...style } : null;
    })
    .filter(Boolean) as { tag: unknown; color: string }[];

  const base = styleFor(match(tc, ["variable"])) ?? { color: fg };
  const highlightStyle = HighlightStyle.define([{ tag: t.name, color: base.color }, ...(styles as never[])]);

  return [editorTheme, syntaxHighlighting(highlightStyle)];
}

const cache = new Map<string, Extension>();

/** Load and cache the exact CodeMirror theme for a Shiki theme id. */
export async function loadCodeMirrorTheme(id: string): Promise<Extension | null> {
  if (cache.has(id)) return cache.get(id)!;
  const loader = isPierreTheme(id) ? PIERRE_THEME_LOADERS[id] : undefined;
  if (!loader) return null;
  const mod = await loader();
  const theme = ((mod as { default?: ShikiTheme }).default ?? mod) as ShikiTheme;
  const ext = buildTheme(theme);
  cache.set(id, ext);
  return ext;
}
