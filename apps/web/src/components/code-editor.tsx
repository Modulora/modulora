import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { githubDark } from "@uiw/codemirror-theme-github";
import type { Extension } from "@codemirror/state";

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
}: {
  path: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      theme={githubDark}
      extensions={extensionsFor(path)}
      height="100%"
      className="h-full text-sm [&_.cm-editor]:h-full [&_.cm-gutters]:bg-[#0d1117] [&_.cm-editor]:bg-[#0d1117]"
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
    />
  );
}
