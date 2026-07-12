/**
 * Live component preview. Renders the actual uploaded files in a sandboxed
 * iframe via Sandpack — no hardcoded mock. Runs untrusted React in an isolated
 * origin; it cannot reach the Modulora app, its cookies, or its DOM.
 */
import { useEffect, useMemo, useState } from "react";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import type { ComponentFile } from "@/data/catalog";

/** Detect the primary component file and its rendered export. */
function resolveEntry(files: ComponentFile[], name: string) {
  const tsx = files.filter((file) => /\.(tsx|jsx)$/.test(file.path));
  const preferred =
    tsx.find((file) => file.path.split("/").pop()?.replace(/\.(tsx|jsx)$/, "") === name) ??
    tsx.find((file) => !/use-|\.test\./.test(file.path)) ??
    tsx[0];
  if (!preferred) return null;

  const source = preferred.content;
  const named = source.match(/export\s+function\s+([A-Z][A-Za-z0-9_]*)/);
  const constExport = source.match(/export\s+const\s+([A-Z][A-Za-z0-9_]*)/);
  const isDefault = /export\s+default/.test(source);

  const importPath = "/src/" + preferred.path.replace(/\.(tsx|jsx)$/, "");
  if (named) return { importPath, statement: `import { ${named[1]} } from "${importPath}"`, render: named[1] };
  if (constExport) return { importPath, statement: `import { ${constExport[1]} } from "${importPath}"`, render: constExport[1] };
  if (isDefault) return { importPath, statement: `import Component from "${importPath}"`, render: "Component" };
  return { importPath, statement: `import * as mod from "${importPath}"`, render: "(Object.values(mod).find((v) => typeof v === 'function') as any)" };
}

/** Rewrite the `@/` alias to a sandbox-absolute path. */
function rewrite(content: string): string {
  return content.replace(/(["'])@\//g, "$1/src/");
}

const DEPENDENCIES = {
  clsx: "latest",
  "tailwind-merge": "latest",
  "class-variance-authority": "latest",
  "lucide-react": "latest",
};

function indexHtml(dark: boolean): string {
  return `<!DOCTYPE html>
<html lang="en"${dark ? ' class="dark"' : ""}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>tailwind.config = { darkMode: "class" }</script>
    <style>
      :root { color-scheme: ${dark ? "dark" : "light"}; }
      body { margin: 0; background: ${dark ? "#0a0a0a" : "#ffffff"}; color: ${dark ? "#fafafa" : "#0a0a0a"}; }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}

export function ComponentSandbox({
  files,
  name,
  theme,
}: {
  files: ComponentFile[];
  name: string;
  theme: "light" | "dark";
}) {
  // Defer mount until after the page's entrance animation settles — Sandpack's
  // in-browser bundler blocks the main thread and would freeze the transition.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const idle =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (window as unknown as { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
        : null;
    const timer = window.setTimeout(() => {
      if (idle) idle(() => setMounted(true), { timeout: 500 });
      else setMounted(true);
    }, 450);
    return () => window.clearTimeout(timer);
  }, []);
  const entry = useMemo(() => resolveEntry(files, name), [files, name]);

  const sandpackFiles = useMemo(() => {
    if (!entry) return {};
    const mapped: Record<string, string> = {};
    for (const file of files) mapped["/src/" + file.path] = rewrite(file.content);
    mapped["/App.tsx"] = `${entry.statement}\n\nexport default function App() {\n  const C = ${entry.render}\n  return (\n    <div className="flex min-h-screen items-center justify-center p-8">\n      <C />\n    </div>\n  )\n}\n`;
    mapped["/public/index.html"] = indexHtml(theme === "dark");
    return mapped;
  }, [entry, files, theme]);

  if (!mounted) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading preview…</div>;
  }
  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No renderable component file found.
      </div>
    );
  }

  return (
    <SandpackProvider
      key={theme}
      template="react-ts"
      theme={theme === "dark" ? "dark" : "light"}
      files={sandpackFiles}
      customSetup={{ dependencies: DEPENDENCIES }}
      options={{ recompileMode: "delayed", recompileDelay: 400 }}
    >
      <SandpackPreview
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showSandpackErrorOverlay
        style={{ height: "100%", minHeight: "30rem" }}
      />
    </SandpackProvider>
  );
}
