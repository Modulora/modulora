/* ─────────────────────────────────────────────────────────
 * COMPONENT EDITOR — multi-step publish flow
 *
 *   Step 1  Build    file rail · code editor · live preview
 *   Step 2  Details  metadata (title, category, pricing, channels)
 *   Step 3  Submit   verification summary → curation queue
 * ───────────────────────────────────────────────────────── */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Eye,
  FileCode2,
  Loader2,
  Moon,
  Plus,
  Rocket,
  Settings2,
  ShieldCheck,
  Sun,
  Trash2,
} from "lucide-react";

import { CodeEditor } from "@/components/code-editor";
import { ComponentSandbox } from "@/components/component-sandbox";
import { PreviewToolbar, type PreviewViewport } from "@/components/preview-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES } from "@/lib/taxonomy";
import { publishComponent, type PublishFile } from "@/lib/publish";
import { demoFiles, isSystemFile, roleFor, scaffoldFiles } from "@/lib/scaffold";

const RISE = { offsetY: 8, spring: { type: "spring" as const, stiffness: 340, damping: 28 } };

const CHANNELS = [
  { id: "shadcn", label: "shadcn CLI" },
  { id: "modulora-cli", label: "Modulora CLI" },
  { id: "compatible-cli", label: "Other CLIs" },
];

const STEPS = [
  { id: "build", label: "Build", icon: FileCode2 },
  { id: "details", label: "Details", icon: Settings2 },
  { id: "submit", label: "Submit", icon: ShieldCheck },
] as const;
type StepId = (typeof STEPS)[number]["id"];

export interface EditorInitial {
  name: string;
  title: string;
  description: string;
  category: string;
  version: string;
  pricing: "free" | "paid";
  purchaseUrl: string;
  distributionChannels: string[];
  shadcnCommand: string;
  otherCliCommand: string;
  originalUrl: string;
  inspiredBy: string[];
  files: PublishFile[];
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export function ComponentEditor({
  username,
  initial,
  mode = "create",
}: {
  username: string | null;
  initial?: EditorInitial;
  mode?: "create" | "edit";
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepId>("build");
  const [ready, setReady] = useState(false);

  const [files, setFiles] = useState<PublishFile[]>(
    initial?.files.length ? initial.files : scaffoldFiles("component"),
  );
  const [activePath, setActivePath] = useState(files[0]!.path);
  const [showSystem, setShowSystem] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("dark");
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>("desktop");
  const [previewKey, setPreviewKey] = useState(0);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [nameEdited, setNameEdited] = useState(Boolean(initial?.name));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<string>(initial?.category ?? CATEGORIES[0]!.id);
  const [pricing, setPricing] = useState<"free" | "paid">(initial?.pricing ?? "free");
  const [purchaseUrl, setPurchaseUrl] = useState(initial?.purchaseUrl ?? "");
  const [channels, setChannels] = useState<string[]>(
    initial?.distributionChannels ?? ["shadcn", "modulora-cli"],
  );
  const [shadcnCommand, setShadcnCommand] = useState(initial?.shadcnCommand ?? "");
  const [otherCliCommand, setOtherCliCommand] = useState(initial?.otherCliCommand ?? "");
  const [originalUrl, setOriginalUrl] = useState(initial?.originalUrl ?? "");
  const [inspiredBy, setInspiredBy] = useState<string[]>(initial?.inspiredBy ?? []);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<{ namespace: string; name: string } | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (initial?.shadcnCommand) return;
    const handle = username ?? "you";
    setShadcnCommand(`npx shadcn@latest add https://modulora.dev/r/@${handle}/name`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const demos = useMemo(() => demoFiles(files), [files]);
  const [selectedDemo, setSelectedDemo] = useState<string>(demos[0]?.path ?? "");
  useEffect(() => {
    if (!demos.some((d) => d.path === selectedDemo)) setSelectedDemo(demos[0]?.path ?? "");
  }, [demos, selectedDemo]);

  const active = files.find((file) => file.path === activePath) ?? files[0];
  const effectiveName = nameEdited ? name : slugify(title);
  const hasComponentFile = files.some(
    (f) => roleFor(f.path) === "component" && f.content.trim().length > 0,
  );

  const canContinueBuild = hasComponentFile || pricing === "paid";
  const canContinueDetails =
    title.trim().length > 0 &&
    effectiveName.length >= 2 &&
    channels.length > 0 &&
    (!channels.includes("shadcn") || shadcnCommand.trim().length > 0) &&
    (!channels.includes("compatible-cli") || otherCliCommand.trim().length > 0) &&
    (pricing !== "paid" || /^https?:\/\//i.test(purchaseUrl.trim()));

  function toggleChannel(id: string) {
    setChannels((current) => {
      const on = current.includes(id);
      if (!on && id === "shadcn" && !shadcnCommand.trim()) {
        const handle = username ?? "you";
        setShadcnCommand(`npx shadcn@latest add https://modulora.dev/r/@${handle}/${effectiveName || "name"}`);
      }
      return on ? current.filter((x) => x !== id) : [...current, id];
    });
  }

  function updateActive(content: string) {
    setFiles((current) => current.map((file) => (file.path === activePath ? { ...file, content } : file)));
  }
  function renameActive(path: string) {
    setFiles((current) => current.map((file) => (file.path === activePath ? { ...file, path } : file)));
    setActivePath(path);
  }
  function addFile(kind: "component" | "demo") {
    const base = kind === "demo" ? "src/demos/demo" : "src/components/ui/file";
    let index = 1;
    let path = `${base}-${index}.tsx`;
    while (files.some((file) => file.path === path)) path = `${base}-${++index}.tsx`;
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
        version: "",
        pricing,
        purchaseUrl: purchaseUrl.trim(),
        distributionChannels: channels,
        shadcnCommand: shadcnCommand.trim(),
        otherCliCommand: otherCliCommand.trim(),
        originalUrl: originalUrl.trim(),
        inspiredBy: inspiredBy.map((url) => url.trim()).filter(Boolean),
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
    return <SubmittedCard published={published} onDone={() => navigate({ to: "/dashboard/components" })} />;
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className={`flex min-h-[calc(100svh-8rem)] flex-col gap-4 ${step === "build" ? "lg:h-[calc(100svh_-_7.5rem)] lg:min-h-0 lg:overflow-hidden" : ""}`}>
      {/* Top bar: back · steps · continue */}
      <motion.div
        initial={{ opacity: 0, y: RISE.offsetY }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={RISE.spring}
        className="flex items-center justify-between gap-4"
      >
        <button
          type="button"
          onClick={() => (stepIndex === 0 ? navigate({ to: "/dashboard/components" }) : setStep(STEPS[stepIndex - 1]!.id))}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {stepIndex === 0 ? "Dashboard" : STEPS[stepIndex - 1]!.label}
        </button>

        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => i < stepIndex && setStep(s.id)}
              disabled={i > stepIndex}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
                s.id === step
                  ? "bg-accent text-foreground"
                  : i < stepIndex
                    ? "text-foreground hover:bg-accent/60"
                    : "text-muted-foreground/50"
              }`}
            >
              <s.icon className="size-3.5" />
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {error ? <span className="max-w-md truncate text-xs text-destructive">{error}</span> : null}
          {step === "build" ? (
            <Button type="button" onClick={() => setStep("details")} disabled={!canContinueBuild} className="gap-2">
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : step === "details" ? (
            <Button type="button" onClick={() => setStep("submit")} disabled={!canContinueDetails} className="gap-2">
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" onClick={onPublish} disabled={publishing} className="gap-2">
              {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
              {mode === "edit" ? "Submit update" : "Submit for review"}
            </Button>
          )}
        </div>
      </motion.div>

      {step === "build" ? (
        <BuildStep
          files={files}
          activePath={activePath}
          setActivePath={setActivePath}
          showSystem={showSystem}
          setShowSystem={setShowSystem}
          active={active}
          updateActive={updateActive}
          renameActive={renameActive}
          addFile={addFile}
          removeFile={removeFile}
          demos={demos}
          selectedDemo={selectedDemo}
          setSelectedDemo={setSelectedDemo}
          previewTheme={previewTheme}
          setPreviewTheme={setPreviewTheme}
          previewViewport={previewViewport}
          setPreviewViewport={setPreviewViewport}
          previewKey={previewKey}
          resetPreview={() => setPreviewKey((v) => v + 1)}
          ready={ready}
        />
      ) : step === "details" ? (
        <DetailsStep
          username={username}
          mode={mode}
          title={title}
          setTitle={setTitle}
          effectiveName={effectiveName}
          setName={(v) => {
            setNameEdited(true);
            setName(slugify(v));
          }}
          description={description}
          setDescription={setDescription}
          category={category}
          setCategory={setCategory}
          pricing={pricing}
          setPricing={setPricing}
          purchaseUrl={purchaseUrl}
          setPurchaseUrl={setPurchaseUrl}
          channels={channels}
          toggleChannel={toggleChannel}
          shadcnCommand={shadcnCommand}
          setShadcnCommand={setShadcnCommand}
          otherCliCommand={otherCliCommand}
          setOtherCliCommand={setOtherCliCommand}
          originalUrl={originalUrl}
          setOriginalUrl={setOriginalUrl}
          inspiredBy={inspiredBy}
          setInspiredBy={setInspiredBy}
        />
      ) : (
        <SubmitStep
          files={files}
          pricing={pricing}
          channels={channels}
          shadcnCommand={shadcnCommand}
          username={username}
          effectiveName={effectiveName}
        />
      )}
    </div>
  );
}

/* ── Step 1: Build ─────────────────────────────────────── */

function BuildStep(props: {
  files: PublishFile[];
  activePath: string;
  setActivePath: (p: string) => void;
  showSystem: boolean;
  setShowSystem: (fn: (v: boolean) => boolean) => void;
  active: PublishFile | undefined;
  updateActive: (content: string) => void;
  renameActive: (path: string) => void;
  addFile: (kind: "component" | "demo") => void;
  removeFile: (path: string) => void;
  demos: PublishFile[];
  selectedDemo: string;
  setSelectedDemo: (p: string) => void;
  previewTheme: "light" | "dark";
  setPreviewTheme: (t: "light" | "dark") => void;
  previewViewport: PreviewViewport;
  setPreviewViewport: (v: PreviewViewport) => void;
  previewKey: number;
  resetPreview: () => void;
  ready: boolean;
}) {
  const {
    files, activePath, setActivePath, showSystem, setShowSystem, active, updateActive,
    renameActive, addFile, removeFile, demos, selectedDemo, setSelectedDemo,
    previewTheme, setPreviewTheme, previewViewport, setPreviewViewport, previewKey, resetPreview, ready,
  } = props;
  const stageRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const component = files.filter((f) => roleFor(f.path) === "component");
    const demo = files.filter((f) => roleFor(f.path) === "demo");
    const rest = files.filter((f) => roleFor(f.path) === "styles" || isSystemFile(f.path));
    return { component, demo, rest };
  }, [files]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={ready ? { opacity: 1 } : {}}
      transition={{ duration: 0.3 }}
      className="grid flex-1 gap-4 lg:min-h-0 lg:grid-cols-[12rem_minmax(0,1fr)_minmax(20rem,28rem)] lg:overflow-hidden"
    >
      {/* Files rail */}
      <aside className="flex flex-col gap-1 overflow-y-auto rounded-xl border border-border/60 bg-card/35 p-2 lg:h-full">
        <FileGroup label="Component" onAdd={() => addFile("component")}>
          {grouped.component.map((file) => (
            <FileRow key={file.path} file={file} activePath={activePath} onOpen={setActivePath} onRemove={grouped.component.length > 1 ? removeFile : undefined} />
          ))}
        </FileGroup>
        <FileGroup label="Demos" onAdd={() => addFile("demo")} hint="Preview only — not installed">
          {grouped.demo.map((file) => (
            <FileRow key={file.path} file={file} activePath={activePath} onOpen={setActivePath} onRemove={grouped.demo.length > 1 ? removeFile : undefined} />
          ))}
        </FileGroup>
        <button
          type="button"
          onClick={() => setShowSystem((v) => !v)}
          className="mt-auto flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          <Eye className="size-3" /> {showSystem ? "Hide system files" : "Show system files"}
        </button>
        {showSystem ? (
          <div className="flex flex-col gap-0.5">
            {grouped.rest.map((file) => (
              <FileRow key={file.path} file={file} activePath={activePath} onOpen={setActivePath} />
            ))}
          </div>
        ) : null}
      </aside>

      {/* Code editor */}
      <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-[#0d1117] lg:h-full">
        <div className="shrink-0 border-b border-border/60 p-2">
          <input
            value={active?.path ?? ""}
            onChange={(e) => renameActive(e.target.value)}
            spellCheck={false}
            aria-label="File path"
            className="w-full rounded-md bg-transparent px-2 py-1 font-mono text-xs text-muted-foreground outline-none focus-visible:bg-secondary/40 focus-visible:text-foreground"
          />
        </div>
        <div className="min-h-[24rem] flex-1 overflow-hidden lg:min-h-0">
          {active ? <CodeEditor path={active.path} value={active.content} onChange={updateActive} /> : null}
        </div>
      </div>

      {/* Live preview */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/35 lg:h-full">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Preview</span>
            {demos.length > 1 ? (
              <select
                value={selectedDemo}
                onChange={(e) => setSelectedDemo(e.target.value)}
                aria-label="Demo variant"
                className="h-7 rounded-md border border-border/60 bg-transparent px-1.5 text-[11px] outline-none"
              >
                {demos.map((d) => (
                  <option key={d.path} value={d.path} className="bg-popover">
                    {d.path.split("/").pop()?.replace(/\.(tsx|jsx)$/, "")}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <PreviewToolbar
            theme={previewTheme}
            onTheme={setPreviewTheme}
            viewport={previewViewport}
            onViewport={setPreviewViewport}
            onRefresh={resetPreview}
            onFullscreen={() => void stageRef.current?.requestFullscreen()}
          />
        </div>
        <div
          ref={stageRef}
          className={`flex min-h-[24rem] flex-1 items-stretch justify-center overflow-auto bg-[#181818] lg:min-h-0 ${previewTheme === "dark" ? "[color-scheme:dark]" : "[color-scheme:light]"}`}
        >
          <div className={`h-full w-full transition-[max-width] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] ${previewViewport === "mobile" ? "max-w-[390px]" : previewViewport === "tablet" ? "max-w-[768px]" : "max-w-none"}`}>
            {selectedDemo ? (
              <ComponentSandbox key={previewKey} files={files} selectedDemo={selectedDemo} theme={previewTheme} className="h-full" />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Add a demo file in src/demos/ — its default export is what renders here.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FileGroup({ label, hint, onAdd, children }: { label: string; hint?: string; onAdd: () => void; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60" title={hint}>
          {label}
        </span>
        <button type="button" onClick={onAdd} aria-label={`Add ${label.toLowerCase()} file`} className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95">
          <Plus className="size-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function FileRow({
  file,
  activePath,
  onOpen,
  onRemove,
}: {
  file: PublishFile;
  activePath: string;
  onOpen: (p: string) => void;
  onRemove?: (p: string) => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
        file.path === activePath ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      }`}
    >
      <button type="button" onClick={() => onOpen(file.path)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <FileCode2 className="size-3.5 shrink-0 opacity-70" />
        <span className="truncate">{file.path.split("/").pop()}</span>
      </button>
      {onRemove ? (
        <button type="button" onClick={() => onRemove(file.path)} aria-label="Remove file" className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/* ── Step 2: Details ───────────────────────────────────── */

function DetailsStep(props: {
  username: string | null;
  mode: "create" | "edit";
  title: string;
  setTitle: (v: string) => void;
  effectiveName: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  pricing: "free" | "paid";
  setPricing: (v: "free" | "paid") => void;
  purchaseUrl: string;
  setPurchaseUrl: (v: string) => void;
  channels: string[];
  toggleChannel: (id: string) => void;
  shadcnCommand: string;
  setShadcnCommand: (v: string) => void;
  otherCliCommand: string;
  setOtherCliCommand: (v: string) => void;
  originalUrl: string;
  setOriginalUrl: (v: string) => void;
  inspiredBy: string[];
  setInspiredBy: (fn: (v: string[]) => string[]) => void;
}) {
  const p = props;
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex flex-col gap-5 rounded-xl border border-border/60 bg-card/35 p-6">
        <MetaField label="Title">
          <Input value={p.title} onChange={(e) => p.setTitle(e.target.value)} placeholder="Calendar" />
        </MetaField>
        <MetaField label="Name" hint={`@${p.username ?? "you"}/${p.effectiveName || "name"}`}>
          <Input value={p.effectiveName} onChange={(e) => p.setName(e.target.value)} placeholder="calendar" disabled={p.mode === "edit"} />
        </MetaField>
        <MetaField label="Description">
          <textarea
            value={p.description}
            onChange={(e) => p.setDescription(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="What it does."
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </MetaField>
        <MetaField label="Category">
          <select
            value={p.category}
            onChange={(e) => p.setCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id} className="bg-popover">
                {c.label}
              </option>
            ))}
          </select>
        </MetaField>

        <MetaField label="Pricing">
          <div className="flex rounded-md border border-border/60 p-0.5">
            <Segment active={p.pricing === "free"} onClick={() => p.setPricing("free")}>Free</Segment>
            <Segment active={p.pricing === "paid"} onClick={() => p.setPricing("paid")}>Paid</Segment>
          </div>
        </MetaField>
        {p.pricing === "paid" ? (
          <MetaField label="Purchase URL">
            <Input value={p.purchaseUrl} onChange={(e) => p.setPurchaseUrl(e.target.value)} placeholder="https://you.dev/buy" />
          </MetaField>
        ) : null}

        <MetaField label="Distribution">
          <div className="flex flex-col gap-2.5">
            {CHANNELS.map((channel) => {
              const on = p.channels.includes(channel.id);
              return (
                <div key={channel.id} className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => p.toggleChannel(channel.id)}
                    className="flex items-center gap-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className={`flex size-4 items-center justify-center rounded border ${on ? "border-foreground bg-foreground text-background" : "border-border"}`}>
                      {on ? <Check className="size-3" /> : null}
                    </span>
                    {channel.label}
                  </button>
                  {on && channel.id === "shadcn" ? (
                    <Input value={p.shadcnCommand} onChange={(e) => p.setShadcnCommand(e.target.value)} placeholder="npx shadcn@latest add …" className="h-8 font-mono text-[11px]" />
                  ) : null}
                  {on && channel.id === "compatible-cli" ? (
                    <Input value={p.otherCliCommand} onChange={(e) => p.setOtherCliCommand(e.target.value)} placeholder="npx your-cli add …" className="h-8 font-mono text-[11px]" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </MetaField>

        <MetaField label="Original URL">
          <Input value={p.originalUrl} onChange={(e) => p.setOriginalUrl(e.target.value)} placeholder="https://github.com/you/repo" />
        </MetaField>

        <MetaField label="Inspired by">
          <div className="flex flex-col gap-2">
            {p.inspiredBy.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={url}
                  onChange={(e) => p.setInspiredBy((list) => list.map((v, i) => (i === index ? e.target.value : v)))}
                  placeholder="https://…"
                  className="h-8"
                />
                <button type="button" aria-label="Remove link" onClick={() => p.setInspiredBy((list) => list.filter((_, i) => i !== index))} className="text-muted-foreground transition-colors hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            {p.inspiredBy.length < 8 ? (
              <button type="button" onClick={() => p.setInspiredBy((list) => [...list, ""])} className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                <Plus className="size-3.5" /> Add link
              </button>
            ) : null}
          </div>
        </MetaField>
      </div>
    </div>
  );
}

/* ── Step 3: Submit ────────────────────────────────────── */

function SubmitStep({
  files,
  pricing,
  channels,
  shadcnCommand,
  username,
  effectiveName,
}: {
  files: PublishFile[];
  pricing: "free" | "paid";
  channels: string[];
  shadcnCommand: string;
  username: string | null;
  effectiveName: string;
}) {
  const installCount = files.filter((f) => roleFor(f.path) === "component").length;
  const demoCount = files.filter((f) => roleFor(f.path) === "demo").length;
  const ownRegistry = /modulora\.dev|localhost/i.test(shadcnCommand);

  const checks: { label: string; detail: string }[] = [
    {
      label: "Curator review",
      detail: "A curator inspects the source and demo before this is listed publicly.",
    },
    ...(pricing === "free"
      ? [
          {
            label: "Content integrity",
            detail: `${installCount} installable file(s) are hashed (SHA-256). The Modulora CLI verifies this digest before writing files and never runs install scripts.`,
          },
          { label: "Secret scan", detail: "All uploaded files are scanned for credential patterns." },
          ...(channels.includes("shadcn")
            ? [
                {
                  label: "Install parity",
                  detail: ownRegistry
                    ? "Your shadcn command installs from Modulora's registry — parity is guaranteed."
                    : "Your shadcn command points at an external registry; its output is fetched and compared file-for-file. A mismatch blocks submission.",
                },
              ]
            : []),
        ]
      : [
          {
            label: "Source not assessed",
            detail: "Paid source is fulfilled by you and is not scanned by Modulora — the listing says so honestly.",
          },
        ]),
  ];

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/35 p-6">
        <h2 className="text-lg font-semibold">Ready to submit</h2>
        <p className="text-sm text-muted-foreground">
          @{username ?? "you"}/{effectiveName || "name"} · {installCount} installable file(s) · {demoCount} demo(s)
        </p>
        <div className="mt-4 flex flex-col divide-y divide-border/60">
          {checks.map((check) => (
            <div key={check.label} className="flex gap-3 py-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">{check.label}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Submitting places this in the curation queue — it will not be publicly listed until approved.
        </p>
      </div>
    </div>
  );
}

/* ── Shared bits ───────────────────────────────────────── */

function MetaField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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

function Segment({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex-1 rounded px-3 py-1.5 text-xs transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function SubmittedCard({ published, onDone }: { published: { namespace: string; name: string }; onDone: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
        <Clock className="size-6" />
      </span>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Submitted for review</h1>
        <p className="mt-1 text-muted-foreground">
          @{published.namespace}/{published.name} is in the curation queue. A curator reviews every submission
          before it&apos;s listed publicly — you&apos;ll see the status in your components.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={onDone}>
        View my components
      </Button>
    </div>
  );
}
