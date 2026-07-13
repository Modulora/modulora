import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ComponentSandbox } from "@/components/component-sandbox";
import { scaffoldFiles } from "@/lib/scaffold";

export const Route = createFileRoute("/sandbox-test")({ component: SandboxTest });

function SandboxTest() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const files = scaffoldFiles("component");
  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Sandbox engine test</h1>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-sm"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        >
          theme: {theme}
        </button>
      </div>
      <div className="h-[32rem] overflow-hidden rounded-xl border border-border">
        <ComponentSandbox files={files} selectedDemo="src/demos/default.tsx" theme={theme} />
      </div>
    </div>
  );
}
