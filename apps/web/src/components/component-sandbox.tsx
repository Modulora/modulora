/**
 * Live component preview. Renders a chosen demo file — whose default export
 * shows the component with realistic props — inside a sandboxed, cross-origin
 * Sandpack iframe. Untrusted React runs isolated from the Modulora app, its
 * cookies, and its DOM.
 *
 * Styling: Tailwind v4 browser build, loaded via Sandpack's documented
 * `externalResources` option. The author's `src/index.css` (v4 syntax: tokens +
 * `@theme inline` mapping) is injected as a `<style type="text/tailwindcss">`
 * block, which is exactly what the v4 browser runtime consumes. No build step,
 * no tailwind.config.js.
 *
 * Editor file model → sandbox mapping (the `src/` prefix is stripped so the
 * `@/* → ./*` tsconfig alias resolves):
 *   src/components/ui/<name>.tsx → /components/ui/<name>.tsx   (installed)
 *   src/demos/<demo>.tsx         → /demos/<demo>.tsx           (preview only)
 *   src/lib/utils.ts             → /lib/utils.ts               (system)
 *   src/index.css                → injected tailwindcss style block
 *   package.json                 → customSetup.dependencies
 */
import { useEffect, useMemo, useState } from "react";
import { SandpackProvider, SandpackPreview, useSandpack } from "@codesandbox/sandpack-react";
import { scaffoldFiles } from "@/lib/scaffold";
import { Logo } from "@/components/logo";

const TAILWIND_V4_CDN = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4";

/**
 * Self-hosted Sandpack bundler origin. The codesandbox.io-hosted bundler is a
 * third-party dependency (and its handshake is blocked on some networks), so
 * dev uses a locally served build of `sandpack-bundler` and prod will use
 * sandpack.modulora.dev. Unset -> Sandpack's default hosted bundler.
 */
const BUNDLER_URL = import.meta.env.VITE_SANDPACK_BUNDLER_URL as string | undefined;

export interface SandboxFile {
  path: string; // e.g. "src/components/ui/button.tsx", "package.json"
  content: string;
}

/** Map an editor path to a sandbox path (strip the leading src/). */
function toSandboxPath(path: string): string {
  return "/" + path.replace(/^src\//, "");
}

/** Pull dependency map out of an author-editable package.json. */
function parseDependencies(files: SandboxFile[]): Record<string, string> {
  const pkg = files.find((f) => f.path === "package.json");
  const base: Record<string, string> = {
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    clsx: "^2.1.0",
    "tailwind-merge": "^2.1.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.363.0",
  };
  if (!pkg) return base;
  try {
    const parsed = JSON.parse(pkg.content) as { dependencies?: Record<string, string> };
    return { ...base, ...(parsed.dependencies ?? {}) };
  } catch {
    return base;
  }
}

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      jsx: "react-jsx",
      esModuleInterop: true,
      baseUrl: ".",
      paths: { "@/*": ["./*"] },
    },
  },
  null,
  2,
);

/**
 * Module that installs the author's index.css as a text/tailwindcss style block
 * (consumed by the v4 browser runtime) and applies the light/dark class.
 */
function tokensModule(css: string, dark: boolean): string {
  // The v4 browser runtime provides the framework import itself.
  const cleaned = css
    .split("\n")
    .filter((line) => !/@import\s+["']tailwindcss["']/.test(line))
    .join("\n")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`");
  return `const css = \`${cleaned}\`;
document.documentElement.classList.toggle("dark", ${dark});
document.documentElement.style.colorScheme = ${dark ? '"dark"' : '"light"'};
let el = document.getElementById("author-tokens");
if (!el) {
  el = document.createElement("style");
  el.setAttribute("type", "text/tailwindcss");
  el.id = "author-tokens";
  document.head.appendChild(el);
}
el.textContent = css;
// The bundler does not inject externalResources; load the Tailwind v4 browser
// runtime ourselves. It scans style[type=text/tailwindcss] blocks on load and
// observes DOM mutations afterwards.
if (!document.getElementById("tw4-runtime")) {
  const s = document.createElement("script");
  s.id = "tw4-runtime";
  s.src = ${JSON.stringify(TAILWIND_V4_CDN)};
  document.head.appendChild(s);
}
export {};
`;
}

/** Breathing Modulora logo shown until the sandbox finishes its first bundle. */
function LoadingCover({ theme }: { theme: "light" | "dark" }) {
  const { listen } = useSandpack();
  const [done, setDone] = useState(false);
  useEffect(
    () =>
      listen((message) => {
        if (message.type === "done") setDone(true);
      }),
    [listen],
  );
  if (done) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      style={{ background: theme === "dark" ? "#181818" : "#ffffff" }}
    >
      <Logo
        className="size-9"
        style={{ color: theme === "dark" ? "#fafafa" : "#0a0a0a", animation: "logo-breathe 1.6s ease-in-out infinite" }}
      />
    </div>
  );
}

export function ComponentSandbox({
  files,
  selectedDemo,
  theme,
  className,
}: {
  files: SandboxFile[];
  selectedDemo: string; // editor path e.g. "src/demos/default.tsx"
  theme: "light" | "dark";
  className?: string;
}) {
  // Defer mount so heavy in-browser bundling never freezes host animations.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 350);
    return () => window.clearTimeout(t);
  }, []);

  // Components published without the editor scaffold (e.g. via the CLI) may
  // omit system files the sandbox needs (lib/utils, index.css, package.json).
  // Fall back to the scaffold defaults for any that are missing.
  const completeFiles = useMemo(() => {
    const present = new Set(files.map((f) => f.path));
    const defaults = scaffoldFiles().filter(
      (f) => ["src/index.css", "src/lib/utils.ts", "package.json"].includes(f.path) && !present.has(f.path),
    );
    return [...files, ...defaults];
  }, [files]);

  const sandpackFiles = useMemo(() => {
    const mapped: Record<string, string> = {};
    let authorCss = "";
    for (const file of completeFiles) {
      if (file.path === "package.json") continue; // consumed by customSetup
      if (file.path === "src/index.css") {
        authorCss = file.content;
        continue; // injected as a tailwindcss style block, not bundled
      }
      mapped[toSandboxPath(file.path)] = file.content;
    }

    mapped["/tsconfig.json"] = TSCONFIG;
    mapped["/tw-tokens.js"] = tokensModule(authorCss, theme === "dark");

    const demoImport = "." + toSandboxPath(selectedDemo).replace(/\.(tsx|jsx)$/, "");
    mapped["/App.tsx"] =
      `import "./tw-tokens.js";\n` +
      `import Demo from "${demoImport}";\n\n` +
      `export default function App() {\n` +
      `  return (\n    <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground p-8">\n      <Demo />\n    </div>\n  );\n}\n`;

    return mapped;
  }, [completeFiles, selectedDemo, theme]);

  const dependencies = useMemo(() => parseDependencies(files), [files]);

  if (!mounted) {
    return (
      <div
        className={`flex h-full items-center justify-center ${className ?? ""}`}
        style={{ background: theme === "dark" ? "#181818" : "#ffffff" }}
      >
        <Logo
          className="size-9"
          style={{ color: theme === "dark" ? "#fafafa" : "#0a0a0a", animation: "logo-breathe 1.6s ease-in-out infinite" }}
        />
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full [&_.sp-preview-container]:h-full! [&_.sp-preview-iframe]:h-full! [&_.sp-preview]:h-full! [&_.sp-wrapper]:h-full! ${className ?? ""}`}
    >
      <SandpackProvider
        key={theme + selectedDemo}
        template="react-ts"
        theme={theme === "dark" ? "dark" : "light"}
        files={sandpackFiles}
        customSetup={{ dependencies }}
        options={{
          externalResources: [TAILWIND_V4_CDN],
          initMode: "immediate",
          recompileMode: "delayed",
          recompileDelay: 400,
          ...(BUNDLER_URL ? { bundlerURL: BUNDLER_URL } : {}),
        }}
      >
        <div className="relative h-full">
          <LoadingCover theme={theme} />
          <SandpackPreview
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            showSandpackErrorOverlay
            style={{ height: "100%" }}
          />
        </div>
      </SandpackProvider>
    </div>
  );
}
