/**
 * Editor file model (21st-style). A component is authored as a small sandbox:
 *   - component files  src/components/ui/*     → installed via the registry
 *   - demo files       src/demos/*             → preview only (default export)
 *   - styles           src/index.css           → preview only
 *   - system files     package.json, lib/utils → preview only, editable
 *
 * Only `component` files ship in the registry-item / `shadcn add` payload.
 */
export type FileRole = "component" | "demo" | "styles" | "system";

export interface EditorFile {
  path: string;
  content: string;
}

export function roleFor(path: string): FileRole {
  if (path === "src/index.css") return "styles";
  if (path === "package.json" || path === "src/app.tsx" || path.startsWith("src/lib/")) return "system";
  if (path.startsWith("src/demos/")) return "demo";
  return "component"; // src/components/**
}

/** Files that are actually installed (registry payload). */
export function installableFiles(files: EditorFile[]): EditorFile[] {
  return files.filter((f) => roleFor(f.path) === "component");
}

export function isSystemFile(path: string): boolean {
  return roleFor(path) === "system";
}

export function demoFiles(files: EditorFile[]): EditorFile[] {
  return files.filter((f) => roleFor(f.path) === "demo");
}

const COMPONENT_TSX = `"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Component({ className }: { className?: string }) {
  const [count, setCount] = React.useState(0);
  return (
    <div className={cn("flex flex-col items-center gap-4 text-foreground", className)}>
      <h2 className="text-2xl font-bold tracking-tight">Component Example</h2>
      <p className="font-mono text-4xl tabular-nums">{count}</p>
      <div className="flex gap-2">
        <button
          onClick={() => setCount((c) => c - 1)}
          className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent"
        >
          −
        </button>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent"
        >
          +
        </button>
      </div>
    </div>
  );
}
`;

const DEMO_DEFAULT_TSX = `// This file is a demo for your component — it's what users see in the preview.
// Add more files in this directory to add more demos.
import { Component } from "@/components/ui/component";

// Only the default export is treated as a demo.
export default function DemoOne() {
  return <Component />;
}
`;

const UTILS_TS = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

const PACKAGE_JSON = `{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
`;

const INDEX_CSS = `/* Tailwind v4 theme. Extend only with what your component needs. */
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(0 0% 9%);
  --primary: hsl(0 0% 9%);
  --primary-foreground: hsl(0 0% 98%);
  --secondary: hsl(0 0% 96%);
  --secondary-foreground: hsl(0 0% 9%);
  --muted: hsl(0 0% 96%);
  --muted-foreground: hsl(0 0% 45%);
  --accent: hsl(0 0% 96%);
  --accent-foreground: hsl(0 0% 9%);
  --destructive: hsl(0 72% 51%);
  --destructive-foreground: hsl(0 0% 98%);
  --border: hsl(0 0% 90%);
  --input: hsl(0 0% 90%);
  --ring: hsl(0 0% 63%);
}

.dark {
  --background: hsl(0 0% 4%);
  --foreground: hsl(0 0% 98%);
  --card: hsl(0 0% 6%);
  --card-foreground: hsl(0 0% 98%);
  --primary: hsl(0 0% 98%);
  --primary-foreground: hsl(0 0% 9%);
  --secondary: hsl(0 0% 15%);
  --secondary-foreground: hsl(0 0% 98%);
  --muted: hsl(0 0% 15%);
  --muted-foreground: hsl(0 0% 64%);
  --accent: hsl(0 0% 15%);
  --accent-foreground: hsl(0 0% 98%);
  --destructive: hsl(0 62% 45%);
  --destructive-foreground: hsl(0 0% 98%);
  --border: hsl(0 0% 18%);
  --input: hsl(0 0% 18%);
  --ring: hsl(0 0% 45%);
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
}
`;

/** The default starter file set for a brand-new component. */
export function scaffoldFiles(componentName = "component"): EditorFile[] {
  const safe = componentName.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "component";
  return [
    { path: `src/components/ui/${safe}.tsx`, content: COMPONENT_TSX },
    { path: "src/demos/default.tsx", content: DEMO_DEFAULT_TSX },
    { path: "src/index.css", content: INDEX_CSS },
    { path: "src/lib/utils.ts", content: UTILS_TS },
    { path: "package.json", content: PACKAGE_JSON },
  ];
}
