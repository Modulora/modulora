import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import type { Extension } from "@codemirror/state";
import { DEFAULT_EDITOR_THEME } from "@/lib/highlight";
import { loadCodeMirrorTheme } from "@/lib/codemirror-theme";

function extensionsFor(path: string): Extension[] {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "css") return [css()];
  if (ext === "json") return [javascript()];
  return [javascript({ jsx: true, typescript: true })];
}

export function CodeEditor({
  path,
  value,
  onChange,
  themeId = DEFAULT_EDITOR_THEME,
  readOnly = false,
}: {
  path: string;
  value: string;
  onChange?: (value: string) => void;
  themeId?: string;
  readOnly?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Extension | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    let active = true;
    loadCodeMirrorTheme(themeId).then((ext) => {
      if (active) setTheme(ext);
    });
    return () => {
      active = false;
    };
  }, [themeId]);

  if (!mounted) {
    return (
      <pre className="h-full overflow-auto bg-[#0d1117] p-4 font-mono text-sm text-zinc-400">
        {value}
      </pre>
    );
  }

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme="none"
      editable={!readOnly}
      readOnly={readOnly}
      extensions={theme ? [...extensionsFor(path), theme] : extensionsFor(path)}
      height="100%"
      className="h-full text-sm [&_.cm-editor]:h-full"
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: !readOnly,
        highlightActiveLineGutter: !readOnly,
      }}
    />
  );
}
