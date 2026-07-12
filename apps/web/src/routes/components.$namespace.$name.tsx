/* ─────────────────────────────────────────────────────────
 * COMPONENT DETAIL — workspace entrance storyboard
 *
 *    0ms   page hidden
 *   70ms   title + creator rise
 *  160ms   preview workspace scales/fades in
 *  250ms   facts/evidence rail slides in
 *  340ms   install tray rises
 * ───────────────────────────────────────────────────────── */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Tabs } from "radix-ui";
import { motion } from "motion/react";
import {
  Check,
  Clipboard,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  FileLock2,
  Flag,
  Folder,
  Loader2,
  Maximize2,
  Monitor,
  Moon,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Sun,
  Tablet,
  Terminal,
  TriangleAlert,
  X,
} from "lucide-react";

import { ComponentPreview } from "@/components/component-preview";
import { ComponentSandbox } from "@/components/component-sandbox";
import { PreviewToolbar } from "@/components/preview-toolbar";
import { demoFiles as pickDemoFiles } from "@/lib/scaffold";
import { ShadcnIcon } from "@/components/brand-icons";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { highlight, langForPath } from "@/lib/highlight";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon } from "@hugeicons-pro/core-solid-sharp";
import { reportComponent, REPORT_REASONS } from "@/lib/report";
import { fetchCatalogDetail } from "@/lib/catalog-db";
import { type CatalogItem, type EvidenceRecord } from "../data/catalog";

interface HighlightedFile {
  path: string;
  html: string;
  raw: string;
}

export const Route = createFileRoute("/components/$namespace/$name")({
  loader: async ({ params }) => {
    const item = await fetchCatalogDetail({ data: { namespace: params.namespace, name: params.name } });
    if (!item) throw notFound();
    // Only open (free) components expose source; highlight server-side.
    const files: HighlightedFile[] =
      item.sourceModel === "open-source" && item.files
        ? await Promise.all(
            item.files.map(async (file) => ({
              path: file.path,
              raw: file.content,
              html: await highlight(file.content, langForPath(file.path)),
            })),
          )
        : [];
    return { item, files };
  },
  component: ComponentDetail,
});

const TIMING = { heading: 70, workspace: 160, rail: 250, install: 340 };
const RISE = {
  offsetY: 10,
  spring: { type: "spring" as const, stiffness: 340, damping: 29 },
};
const WORKSPACE = {
  initialScale: 0.985,
  spring: { type: "spring" as const, stiffness: 280, damping: 28 },
};
const RAIL = {
  offsetX: 12,
  spring: { type: "spring" as const, stiffness: 320, damping: 30 },
};

const EVIDENCE_LABELS: Record<string, string> = {
  "publisher-identity": "Published by",
  "content-integrity": "Content integrity",
  "install-parity": "Install parity",
  "domain-verified": "Domain verified",
  "secret-scan": "Secret scan",
  "source-not-assessed": "Source not assessed",
  "dependency-scan": "Dependency scan",
  "license-scan": "License scan",
  "static-analysis": "Static analysis",
  "build-checked": "Build checked",
  "human-reviewed": "Human reviewed",
  deprecated: "Deprecated",
  revoked: "Revoked",
};

function ComponentDetail() {
  const { item, files } = Route.useLoaderData();
  const [stage, setStage] = useState(0);
  const [workspaceTab, setWorkspaceTab] = useState("preview");
  const [installTab, setInstallTab] = useState(
    item.distributionChannels?.includes("shadcn") ? "shadcn" : "modulora-cli",
  );
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [viewport, setViewport] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const previewStageRef = useRef<HTMLDivElement>(null);

  // Demo model: published components carry preview-only demo files; each demo's
  // default export is a variant, rendered live in the sandbox.
  const demos = useMemo(() => pickDemoFiles(item.files ?? []), [item.files]);
  const [activeDemo, setActiveDemo] = useState<string>(demos[0]?.path ?? "");
  // Paid components are fulfilled by the creator; Modulora hosts no source.
  const isPaid = item.sourceModel !== "open-source";

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), TIMING.heading),
      setTimeout(() => setStage(2), TIMING.workspace),
      setTimeout(() => setStage(3), TIMING.rail),
      setTimeout(() => setStage(4), TIMING.install),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const commands = useMemo(
    () => ({
      shadcn: `npx shadcn@latest add https://modulora.dev/r/@${item.namespace}/${item.name}@${item.version}`,
      "modulora-cli": `npx modulora add @${item.namespace}/${item.name}@${item.version}`,
      prompt: `Install @${item.namespace}/${item.name}@${item.version} from Modulora. Verify the published digest before changing files and show me the install plan first.`,
    }),
    [item],
  );

  const enabledInstallTabs = isPaid
    ? []
    : [
        ...(item.distributionChannels?.includes("shadcn") ? ["shadcn"] : []),
        ...(item.distributionChannels?.includes("modulora-cli") ? ["modulora-cli"] : []),
        "prompt",
      ];

  return (
    <div className="flex flex-col gap-6">
      <motion.header
        initial={{ opacity: 0, y: RISE.offsetY }}
        animate={{ opacity: stage >= 1 ? 1 : 0, y: stage >= 1 ? 0 : RISE.offsetY }}
        transition={RISE.spring}
        className="flex flex-col gap-2"
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/$username" params={{ username: item.namespace }} className="hover:text-foreground">@{item.namespace}</Link>
          <span>·</span><span>v{item.version}</span><span>·</span><span>React</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">{item.description}</p>
          </div>
          <Badge variant={isPaid ? "outline" : "secondary"}>
            {isPaid ? item.purchase?.priceLabel ?? "Paid" : "Free"}
          </Badge>
        </div>
      </motion.header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-3">
          <motion.div
            initial={{ opacity: 0, y: RISE.offsetY }}
            animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : RISE.offsetY }}
            transition={RISE.spring}
          >
            {isPaid ? (
              <CommercialTray item={item} />
            ) : (
              <InstallTray
                tabs={enabledInstallTabs}
                active={installTab}
                onActive={setInstallTab}
                commands={commands}
              />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: WORKSPACE.initialScale }}
            animate={{ opacity: stage >= 3 ? 1 : 0, scale: stage >= 3 ? 1 : WORKSPACE.initialScale }}
            transition={WORKSPACE.spring}
          >
            <Tabs.Root value={workspaceTab} onValueChange={setWorkspaceTab} className="overflow-hidden rounded-xl border border-border/60 bg-[#0d0d0d]">
              <div className="flex h-12 items-center justify-between border-b border-border/60 px-3">
                <Tabs.List className="flex items-center gap-1">
                  <WorkspaceTab value="preview" icon={PackageCheck}>Preview</WorkspaceTab>
                  <WorkspaceTab value="code" icon={Code2}>{isPaid ? "Code" : "Raw code"}</WorkspaceTab>
                </Tabs.List>
                {workspaceTab === "preview" ? (
                  <div className="flex items-center gap-2">
                    {demos.length > 1 ? (
                      <select
                        value={activeDemo}
                        onChange={(event) => setActiveDemo(event.target.value)}
                        aria-label="Demo variant"
                        className="h-7 rounded-md border border-border/60 bg-transparent px-2 text-xs outline-none"
                      >
                        {demos.map((demo) => (
                          <option key={demo.path} value={demo.path} className="bg-popover">
                            {demo.path.split("/").pop()?.replace(/\.(tsx|jsx)$/, "")}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <PreviewToolbar
                      theme={previewTheme}
                      onTheme={setPreviewTheme}
                      viewport={viewport}
                      onViewport={setViewport}
                      onRefresh={() => setPreviewKey((value) => value + 1)}
                      onFullscreen={() => void previewStageRef.current?.requestFullscreen()}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">{item.category}</span>
                )}
              </div>
              <Tabs.Content value="preview" className="outline-none">
                <div ref={previewStageRef} className={`flex h-[36rem] items-center justify-center overflow-auto bg-[#181818] p-4 ${previewTheme === "dark" ? "[color-scheme:dark]" : "[color-scheme:light]"}`}>
                  <div className={`h-full w-full transition-[max-width] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] ${viewport === "mobile" ? "max-w-[390px]" : viewport === "tablet" ? "max-w-[768px]" : "max-w-none"}`}>
                    {demos.length > 0 && activeDemo ? (
                      <ComponentSandbox
                        key={previewKey}
                        files={item.files ?? []}
                        selectedDemo={activeDemo}
                        theme={previewTheme}
                        className="h-full w-full"
                      />
                    ) : (
                      <ComponentPreview key={previewKey} item={item} theme={previewTheme} interactive className="min-h-[30rem] w-full" />
                    )}
                  </div>
                </div>
              </Tabs.Content>
              <Tabs.Content value="code" className="relative outline-none">
                {isPaid ? <LockedCode item={item} /> : <SourceFiles item={item} files={files} />}
              </Tabs.Content>
            </Tabs.Root>
          </motion.div>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: RAIL.offsetX }}
          animate={{ opacity: stage >= 3 ? 1 : 0, x: stage >= 3 ? 0 : RAIL.offsetX }}
          transition={RAIL.spring}
          className="flex flex-col gap-3"
        >
          {typeof item.installCount === "number" ? (
            <FactCard label="Verified CLI installs" value={item.installCount.toLocaleString()} icon={Terminal} />
          ) : null}
          <FactCard label="License" value={item.license.kind === "spdx" ? item.license.spdxExpression : item.license.kind} icon={FileLock2} />
          <div className="rounded-xl border border-border/60 bg-card/35 p-4">
            <div className="mb-3 flex items-center gap-2"><ShieldCheck className="size-4" /><h2 className="text-sm font-semibold">Provenance &amp; integrity</h2></div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">Installs copy exactly these files and never run install scripts. Each record below is scoped to this release and independently checkable — not a guarantee the code is safe to run.</p>
            <TooltipProvider delayDuration={150}>
              <div className="flex flex-col divide-y divide-border/60">
                {item.evidence.map((record, index) => <EvidenceRow key={`${record.type}-${index}`} record={record} />)}
              </div>
            </TooltipProvider>
          </div>
          {item.source ? (
            <a href={item.source.repository} rel="noreferrer" className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
              Source repository <ExternalLink className="size-3.5" />
            </a>
          ) : null}
          <ReportComponent namespace={item.namespace} name={item.name} />
        </motion.aside>
      </div>
    </div>
  );
}

function WorkspaceTab({ value, icon: Icon, children }: { value: string; icon: typeof Code2; children: ReactNode }) {
  return (
    <Tabs.Trigger value={value} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-accent data-[state=active]:text-foreground">
      <Icon className="size-3.5" />{children}
    </Tabs.Trigger>
  );
}


function SourceFiles({ item, files }: { item: CatalogItem; files: HighlightedFile[] }) {
  const [active, setActive] = useState(files[0]?.path ?? "");

  if (files.length === 0) {
    return (
      <div className="flex h-[36rem] items-center justify-center bg-[#080808] text-sm text-muted-foreground">
        Source for {item.title} is published with each release.
      </div>
    );
  }

  const current = files.find((file) => file.path === active) ?? files[0]!;

  return (
    <div className="grid h-[36rem] grid-cols-[13rem_1fr] bg-[#080808]">
      <div className="flex flex-col overflow-y-auto border-r border-border/60 p-2">
        <span className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {files.length} file{files.length === 1 ? "" : "s"}
        </span>
        <FileTree
          nodes={buildFileTree(files.map((file) => file.path))}
          activePath={current.path}
          onSelect={setActive}
          depth={0}
        />
      </div>
      <div className="relative min-w-0">
        <div className="absolute right-3 top-3 z-10"><CopyButton value={current.raw} /></div>
        <div
          className="h-[36rem] overflow-auto p-5 text-sm leading-7 [&_pre]:!bg-transparent [&_pre]:font-mono"
          // Shiki output is generated from trusted, server-highlighted source.
          dangerouslySetInnerHTML={{ __html: current.html }}
        />
      </div>
    </div>
  );
}

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: Map<string, TreeNode>;
}

function buildFileTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isFile: false, children: new Map() };
  for (const path of paths) {
    const parts = path.split("/");
    let node = root;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      let child = node.children.get(part);
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, index + 1).join("/"),
          isFile,
          children: new Map(),
        };
        node.children.set(part, child);
      }
      node = child;
    });
  }
  return root;
}

function FileTree({
  nodes,
  activePath,
  onSelect,
  depth,
}: {
  nodes: TreeNode;
  activePath: string;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const entries = [...nodes.children.values()].sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      {entries.map((node) =>
        node.isFile ? (
          <button
            key={node.path}
            type="button"
            aria-pressed={node.path === activePath}
            onClick={() => onSelect(node.path)}
            style={{ paddingLeft: depth * 12 + 8 }}
            className={`flex items-center gap-2 rounded-md py-1.5 pr-2 text-left text-xs transition-colors ${node.path === activePath ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
          >
            <FileCode2 className="size-3.5 shrink-0 opacity-70" />
            <span className="truncate">{node.name}</span>
          </button>
        ) : (
          <div key={node.path}>
            <div
              style={{ paddingLeft: depth * 12 + 8 }}
              className="flex items-center gap-2 py-1.5 pr-2 text-xs text-muted-foreground/70"
            >
              <Folder className="size-3.5 shrink-0 opacity-70" />
              <span className="truncate">{node.name}</span>
            </div>
            <FileTree nodes={node} activePath={activePath} onSelect={onSelect} depth={depth + 1} />
          </div>
        ),
      )}
    </>
  );
}

function LockedCode({ item }: { item: CatalogItem }) {
  return (
    <div className="relative h-[36rem] overflow-hidden bg-[#080808]">
      <pre aria-hidden className="select-none p-5 font-mono text-sm leading-7 text-zinc-500 blur-[5px]">{`export function ${item.title.replace(/\s/g, "")}() {\n  // Paid component — source delivered on purchase\n  return <PremiumComponent />\n}\n`.repeat(5)}</pre>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 text-center backdrop-blur-[2px]">
        <span className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/60"><FileLock2 className="size-5" /></span>
        <div><p className="font-semibold">Paid component</p><p className="mt-1 max-w-xs text-sm text-muted-foreground">Purchase and fulfillment are handled by the creator. Modulora hosts no source and has not assessed it.</p></div>
        {item.purchase ? <Button asChild><a href={item.purchase.url} rel="noreferrer">View on {item.purchase.domain}<ExternalLink /></a></Button> : null}
      </div>
    </div>
  );
}

function InstallTray({ tabs, active, onActive, commands }: { tabs: string[]; active: string; onActive: (value: string) => void; commands: Record<string, string> }) {
  return (
    <Tabs.Root value={active} onValueChange={onActive} className="overflow-hidden rounded-xl border border-border/60 bg-card/35">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <Tabs.List className="flex items-center gap-1">
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-accent data-[state=active]:text-foreground [&_svg]:size-3.5"
            >
              <InstallTabIcon tab={tab} />
              {tab === "modulora-cli" ? "Modulora CLI" : tab === "shadcn" ? "shadcn" : "Prompt"}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <CopyButton value={commands[active] ?? ""} />
      </div>
      {tabs.map((tab) => <Tabs.Content key={tab} value={tab} className="outline-none"><pre className="overflow-x-auto bg-[#080808] p-4 font-mono text-sm text-zinc-300"><code>{commands[tab]}</code></pre></Tabs.Content>)}
    </Tabs.Root>
  );
}

function InstallTabIcon({ tab }: { tab: string }) {
  if (tab === "shadcn") return <ShadcnIcon />;
  if (tab === "modulora-cli") return <Logo />;
  return <Sparkles />;
}

function CommercialTray({ item }: { item: CatalogItem }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/35 p-4">
      <div><p className="text-sm font-medium">Available from the creator</p><p className="mt-1 text-xs text-muted-foreground">No source or install artifact is distributed by Modulora.</p></div>
      {item.purchase ? <Button asChild><a href={item.purchase.url} rel="noreferrer">{item.purchase.priceLabel ?? "View component"}<ExternalLink /></a></Button> : null}
    </div>
  );
}

function ReportComponent({ namespace, name }: { namespace: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]!.id);
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setPending(true);
    setError(null);
    const result = await reportComponent({ data: { namespace, name, reason, details } });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Could not submit.");
      return;
    }
    setDone(true);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setDone(false); setError(null); setDetails(""); } }}>
      <DialogTrigger asChild>
        <button type="button" className="flex items-center justify-center gap-2 rounded-xl border border-border/60 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive">
          <Flag className="size-3.5" /> Report
        </button>
      </DialogTrigger>
      <DialogContent>
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400"><Check className="size-5" /></span>
            <div><p className="font-semibold">Report submitted</p><p className="mt-1 text-sm text-muted-foreground">Thanks — our team will review it.</p></div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report this component</DialogTitle>
              <DialogDescription>Flag @{namespace}/{name} for stolen source, license abuse, or another issue.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="report-reason">Reason</Label>
                <select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                  {REPORT_REASONS.map((r) => <option key={r.id} value={r.id} className="bg-popover">{r.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="report-details">Details <span className="text-muted-foreground">(optional)</span></Label>
                <textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} placeholder="Links, original source, context…" className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <Button type="button" variant="destructive" onClick={onSubmit} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null} Submit report
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1400); }
  return <button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy"}</button>;
}

function FactCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Terminal }) {
  return <div className="rounded-xl border border-border/60 bg-card/35 p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Icon className="size-3.5" /></div><p className="mt-2 text-2xl font-bold tracking-tight">{value}</p></div>;
}

function EvidenceRow({ record }: { record: EvidenceRecord }) {
  const passed = record.status === "passed";
  const leadIcon = passed ? (
    <span className="mt-0.5 text-emerald-500"><HugeiconsIcon icon={CheckmarkBadge01Icon} size={18} /></span>
  ) : record.status === "warning" ? (
    <span className="mt-0.5 flex size-[18px] items-center justify-center rounded-full bg-amber-500/15 text-amber-500"><TriangleAlert className="size-3" /></span>
  ) : record.status === "failed" ? (
    <span className="mt-0.5 flex size-[18px] items-center justify-center rounded-full bg-destructive/15 text-destructive"><X className="size-3" /></span>
  ) : (
    <span className="mt-0.5 flex size-[18px] items-center justify-center rounded-full bg-secondary text-muted-foreground"><Clipboard className="size-3" /></span>
  );

  const body = (
    <div className="min-w-0">
      <p className="truncate text-xs font-medium">{EVIDENCE_LABELS[record.type] ?? record.type}</p>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{record.scope ?? record.limitations ?? record.issuer}</p>
    </div>
  );

  return (
    <div className="flex gap-2.5 py-3 first:pt-0 last:pb-0">
      {record.limitations ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="What this proves" className="shrink-0 cursor-help outline-none">{leadIcon}</button>
          </TooltipTrigger>
          <TooltipContent side="left">{record.limitations}</TooltipContent>
        </Tooltip>
      ) : (
        <span className="shrink-0">{leadIcon}</span>
      )}
      {body}
    </div>
  );
}
