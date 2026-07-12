/* ─────────────────────────────────────────────────────────
 * STUDIO EDITOR (/dashboard/new) — entrance storyboard
 *
 *    0ms   layout hidden
 *   60ms   top bar settles in
 *  140ms   files rail slides in from the left
 *  200ms   editor + metadata fade in
 * ───────────────────────────────────────────────────────── */
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Check,
  FileCode2,
  Loader2,
  Plus,
  Rocket,
  Trash2,
} from "lucide-react";

import { CodeEditor } from "@/components/code-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES } from "@/lib/taxonomy";
import { publishComponent, type PublishFile } from "@/lib/publish";

export const Route = createFileRoute("/dashboard/new")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  component: Editor,
});

const TIMING = { bar: 60, rail: 140, body: 200 };
const RISE = {
  offsetY: 8,
  spring: { type: "spring" as const, stiffness: 340, damping: 28 },
};
const RAIL = {
  offsetX: -10,
  spring: { type: "spring" as const, stiffness: 320, damping: 30 },
};

const CHANNELS = [
  { id: "shadcn", label: "shadcn CLI" },
  { id: "modulora-cli", label: "Modulora CLI" },
  { id: "compatible-cli", label: "Other CLIs" },
];

const STARTER: PublishFile[] = [
  {
    path: "components/ui/component.tsx",
    content: `import * as React from "react"

export function Component() {
  return <div>Hello from Modulora</div>
}
`,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function Editor() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);

  const [files, setFiles] = useState<PublishFile[]>(STARTER);
  const [activePath, setActivePath] = useState(STARTER[0]!.path);
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]!.id);
  const [version, setVersion] = useState("0.1.0");
  const [pricing, setPricing] = useState<"free" | "paid">("free");
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [channels, setChannels] = useState<string[]>(["shadcn", "modulora-cli", "compatible-cli"]);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<{ namespace: string; name: string } | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), TIMING.bar),
      setTimeout(() => setStage(2), TIMING.rail),
      setTimeout(() => setStage(3), TIMING.body),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const active = files.find((file) => file.path === activePath) ?? files[0];
  const effectiveName = nameEdited ? name : slugify(title);
  const canPublish =
    title.trim().length > 0 &&
    effectiveName.length >= 2 &&
    files.some((file) => file.content.trim().length > 0) &&
    channels.length > 0;

  function updateActive(content: string) {
    setFiles((current) => current.map((file) => (file.path === activePath ? { ...file, content } : file)));
  }

  function renameActive(path: string) {
    setFiles((current) => current.map((file) => (file.path === activePath ? { ...file, path } : file)));
    setActivePath(path);
  }

  function addFile() {
    let index = files.length + 1;
    let path = `components/ui/file-${index}.tsx`;
    while (files.some((file) => file.path === path)) path = `components/ui/file-${++index}.tsx`;
    setFiles((current) => [...current, { path, content: "" }]);
    setActivePath(path);
  }

  function removeFile(path: string) {
    if (files.length === 1) return;
    const remaining = files.filter((file) => file.path !== path);
    setFiles(remaining);
    if (activePath === path) setActivePath(remaining[0]!.path);
  }

  async function onPublish() {
    setPublishing(true);
    setError(null);
    const current = ++seq.current;
    const result = await publishComponent({
      data: {
        name: effectiveName,
        title: title.trim(),
        description: description.trim(),
        category,
        version: version.trim(),
        pricing,
        purchaseUrl: purchaseUrl.trim(),
        distributionChannels: channels,
        files,
      },
    });
    if (current !== seq.current) return;
    setPublishing(false);
    if (!result.ok) {
      setError(result.error ?? "Could not publish.");
      return;
    }
    setPublished({ namespace: result.namespace!, name: result.name! });
  }

  if (published) {
    return <PublishedCard published={published} version={version} onDashboard={() => navigate({ to: "/dashboard" })} />;
  }

  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col gap-4">
      <motion.div
        initial={{ opacity: 0, y: RISE.offsetY }}
        animate={{ opacity: stage >= 1 ? 1 : 0, y: stage >= 1 ? 0 : RISE.offsetY }}
        transition={RISE.spring}
        className="flex items-center justify-between"
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard" })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Studio
        </button>
        <div className="flex items-center gap-3">
          {error ? <span className="max-w-md truncate text-xs text-destructive">{error}</span> : null}
          <Button type="button" onClick={onPublish} disabled={!canPublish || publishing} className="gap-2">
            {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            Publish
          </Button>
        </div>
      </motion.div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[13rem_minmax(0,1fr)_18rem]">
        <motion.aside
          initial={{ opacity: 0, x: RAIL.offsetX }}
          animate={{ opacity: stage >= 2 ? 1 : 0, x: stage >= 2 ? 0 : RAIL.offsetX }}
          transition={RAIL.spring}
          className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/35 p-2"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Files</span>
            <button type="button" onClick={addFile} aria-label="Add file" className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95">
              <Plus className="size-3.5" />
            </button>
          </div>
          {files.map((file) => (
            <div
              key={file.path}
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${file.path === activePath ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
            >
              <button type="button" onClick={() => setActivePath(file.path)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <FileCode2 className="size-3.5 shrink-0 opacity-70" />
                <span className="truncate">{file.path.split("/").pop()}</span>
              </button>
              {files.length > 1 ? (
                <button type="button" onClick={() => removeFile(file.path)} aria-label="Remove file" className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          ))}
        </motion.aside>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 3 ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-[#0d1117]"
        >
          <div className="border-b border-border/60 p-2">
            <input
              value={active?.path ?? ""}
              onChange={(event) => renameActive(event.target.value)}
              spellCheck={false}
              aria-label="File path"
              className="w-full rounded-md bg-transparent px-2 py-1 font-mono text-xs text-muted-foreground outline-none focus-visible:bg-secondary/40 focus-visible:text-foreground"
            />
          </div>
          <div className="min-h-[24rem] flex-1">
            {active ? <CodeEditor path={active.path} value={active.content} onChange={updateActive} /> : null}
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 3 ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/35 p-4"
        >
          <MetaField label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Calendar" />
          </MetaField>
          <MetaField label="Name" hint={`@you/${effectiveName || "name"}`}>
            <Input value={effectiveName} onChange={(e) => { setNameEdited(true); setName(slugify(e.target.value)); }} placeholder="calendar" />
          </MetaField>
          <MetaField label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={280} placeholder="What it does." className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
          </MetaField>
          <div className="grid grid-cols-2 gap-3">
            <MetaField label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                {CATEGORIES.map((c) => <option key={c.id} value={c.id} className="bg-popover">{c.label}</option>)}
              </select>
            </MetaField>
            <MetaField label="Version">
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="0.1.0" />
            </MetaField>
          </div>

          <MetaField label="Pricing">
            <div className="flex rounded-md border border-border/60 p-0.5">
              <Segment active={pricing === "free"} onClick={() => setPricing("free")}>Free</Segment>
              <Segment active={pricing === "paid"} onClick={() => setPricing("paid")}>Paid</Segment>
            </div>
          </MetaField>
          {pricing === "paid" ? (
            <MetaField label="Purchase URL">
              <Input value={purchaseUrl} onChange={(e) => setPurchaseUrl(e.target.value)} placeholder="https://you.dev/buy" />
            </MetaField>
          ) : null}

          <MetaField label="Distribution">
            <div className="flex flex-col gap-1.5">
              {CHANNELS.map((channel) => {
                const on = channels.includes(channel.id);
                return (
                  <button key={channel.id} type="button" aria-pressed={on} onClick={() => setChannels((c) => on ? c.filter((x) => x !== channel.id) : [...c, channel.id])} className="flex items-center gap-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground">
                    <span className={`flex size-4 items-center justify-center rounded border ${on ? "border-foreground bg-foreground text-background" : "border-border"}`}>{on ? <Check className="size-3" /> : null}</span>
                    {channel.label}
                  </button>
                );
              })}
            </div>
          </MetaField>
        </motion.aside>
      </div>
    </div>
  );
}

function MetaField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {hint ? <span className="font-mono text-[10px] text-muted-foreground/70">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Segment({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`flex-1 rounded px-3 py-1.5 text-xs transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function PublishedCard({ published, version, onDashboard }: { published: { namespace: string; name: string }; version: string; onDashboard: () => void }) {
  const command = `npx shadcn@latest add https://modulora.dev/r/@${published.namespace}/${published.name}@${version}`;
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400"><Check className="size-6" /></span>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Published</h1>
        <p className="mt-1 text-muted-foreground">@{published.namespace}/{published.name}@{version} is live in your studio.</p>
      </div>
      <pre className="w-full overflow-x-auto rounded-lg border border-border/60 bg-[#080808] p-3 text-left font-mono text-xs text-zinc-300"><code>{command}</code></pre>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onDashboard}>Back to studio</Button>
      </div>
    </div>
  );
}
