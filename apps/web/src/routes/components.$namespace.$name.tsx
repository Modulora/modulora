import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { buyComponent, confirmCheckout } from "@/lib/marketplace";
import { OwnedTray } from "@/components/owned";
import { CollectionView } from "@/components/collection-view";
import { ToolListingDetail } from "@/components/tool-listing-detail";
import { fetchCollectionDetail } from "@/lib/catalog-db";
import { PriceSeal } from "@/components/money";
import { SaveMenu } from "@/components/save-menu";
import { Tabs } from "radix-ui";
import { HiCheck as Check, HiClipboard as Clipboard, HiCodeBracket as Code2, HiDocumentDuplicate as Copy, HiArrowTopRightOnSquare as ExternalLink, HiCodeBracketSquare as FileCode2, HiLockClosed as FileLock2, HiFlag as Flag, HiFolder as Folder, HiArrowPath as Loader2, HiArchiveBox as PackageCheck, HiShieldCheck as ShieldCheck, HiSparkles as Sparkles, HiCommandLine as Terminal, HiExclamationTriangle as TriangleAlert, HiXMark as X } from "react-icons/hi2";


import { ComponentPreview } from "@/components/component-preview";
import { ComponentSandbox } from "@/components/component-sandbox";
import { PreviewToolbar } from "@/components/preview-toolbar";
import { demoFiles as pickDemoFiles } from "@/lib/scaffold";
import { ShadcnIcon, XIcon } from "@/components/brand-icons";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CodeEditor } from "@/components/code-editor";
import { usePageTheme } from "@/lib/use-page-theme";
import { resolvePierreCodeTheme, type ColorVisionMode } from "@/lib/pierre-theme";
import { fetchCurrentUser } from "@/lib/session";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HiCheckBadge } from "react-icons/hi2";
import { reportComponent, REPORT_REASONS } from "@/lib/report";
import { fetchCatalogDetail } from "@/lib/catalog-db";
import { formatListingDate, isPaidCatalogItem, needsInteractionHint, type CatalogItem, type EvidenceRecord } from "../data/catalog";
import { ComponentDetailError, ComponentDetailLoading } from "@/components/component-detail-state";
import { externalDomainDisclosure } from "@/lib/external-sales";

interface HighlightedFile {
  path: string;
  raw: string;
}

export const Route = createFileRoute("/components/$namespace/$name")({
  loader: async ({ params }) => {
    const item = await fetchCatalogDetail({ data: { namespace: params.namespace, name: params.name } });
    if (!item) {
      // No component by that name — it may be a collection (same URL space
      // as /r/). Rendered in the same page shell with a member rail.
      const collection = await fetchCollectionDetail({ data: { namespace: params.namespace, name: params.name } });
      if (!collection) throw notFound();
      return { kind: "collection" as const, collection, item: null, files: [], colorVisionMode: "standard" as ColorVisionMode, viewerPlus: false };
    }
    // Only open (free) components expose source. Rendered client-side in a
    // read-only editor using the viewer's chosen code theme (settings).
    const viewer = await fetchCurrentUser();
    const files: HighlightedFile[] =
      item.sourceModel === "open-source" && item.files
        ? item.files.map((file) => ({ path: file.path, raw: file.content }))
        : [];
    return { kind: "component" as const, collection: null, item, files, colorVisionMode: viewer?.colorVisionMode ?? "standard", viewerPlus: viewer?.isPlus ?? false };
  },
  pendingComponent: ComponentDetailLoading,
  errorComponent: ComponentDetailError,
  component: ComponentDetail,
});

const EVIDENCE_LABELS: Record<string, string> = {
  "publisher-identity": "Published by",
  "content-integrity": "Content integrity",
  "install-parity": "Install parity",
  "domain-verified": "Domain verified",
  "secret-scan": "Secret scan",
  "source-not-assessed": "Source not assessed",
  "similarity-screen": "Similarity screening",
  "dependency-scan": "Dependency scan",
  "license-scan": "License scan",
  "static-analysis": "Static analysis",
  "build-checked": "Build checked",
  "human-reviewed": "Human reviewed",
  deprecated: "Deprecated",
  revoked: "Revoked",
};

function ComponentDetail() {
  const data = Route.useLoaderData();
  if (data.kind === "collection") return <CollectionView collection={data.collection} />;
  if (data.item.listingKind === "tool") return <ToolListingDetail item={data.item} />;
  return <ComponentDetailInner item={data.item} files={data.files} colorVisionMode={data.colorVisionMode} viewerPlus={data.viewerPlus} />;
}

function ComponentDetailInner({ item, files, colorVisionMode, viewerPlus }: { item: NonNullable<Awaited<ReturnType<typeof fetchCatalogDetail>>>; files: HighlightedFile[]; colorVisionMode: ColorVisionMode; viewerPlus: boolean }) {
  const listedDate = formatListingDate(item.listedAt);
  const [workspaceTab, setWorkspaceTab] = useState("preview");
  const [installTab, setInstallTab] = useState(
    item.distributionChannels?.includes("shadcn")
      ? "shadcn"
      : item.distributionChannels?.includes("modulora-cli")
        ? "modulora-cli"
        : item.distributionChannels?.includes("compatible-cli") && item.otherCliCommand
          ? "own-registry"
          : "prompt",
  );
  // Preview defaults to the site's theme; the toolbar can override per-view.
  const pageTheme = usePageTheme();
  const [themeOverride, setThemeOverride] = useState<"light" | "dark" | null>(null);
  const previewTheme = themeOverride ?? pageTheme;
  const setPreviewTheme = setThemeOverride;
  const [viewport, setViewport] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [purchaseReturnError, setPurchaseReturnError] = useState<string | null>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const viewerTheme = resolvePierreCodeTheme(pageTheme, colorVisionMode);

  // Demo model: published components carry preview-only demo files; each demo's
  // default export is a variant, rendered live in the sandbox.
  const demos = useMemo(() => pickDemoFiles(item.files ?? []), [item.files]);
  const interactionHint = useMemo(
    () => (needsInteractionHint(item.files) ? "Move your pointer inside · click to trigger the effect" : undefined),
    [item.files],
  );
  const [activeDemo, setActiveDemo] = useState<string>(demos[0]?.path ?? "");
  // Commerce display includes paid collection membership. Source access stays
  // tied to the component's actual fulfillment model and entitlement.
  const isPaid = isPaidCatalogItem(item);
  const isCommercialSource = item.sourceModel !== "open-source";
  // Marketplace-priced: an open component sold on Modulora, source gated behind
  // purchase until the viewer owns it.
  // Entitlement protects source even while direct checkout UI is disabled.
  const locked = item.entitled === false;
  const router = useRouter();

  // Confirm a returning purchase Checkout, then reload with the entitlement.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sid = new URLSearchParams(window.location.search).get("purchase");
    if (!sid) return;
    void confirmCheckout({ data: { sessionId: sid } })
      .then(() => {
        window.history.replaceState(null, "", window.location.pathname);
        void router.invalidate();
      })
      .catch(() => {
        setPurchaseReturnError("We could not confirm this purchase yet. Refresh to try again, or contact support if the charge completed.");
      });
  }, [router]);

  const commands = useMemo(
    () => ({
      shadcn: `npx shadcn@latest add https://modulora.dev/r/@${item.namespace}/${item.name}@${item.version}`,
      "modulora-cli": `npx modulora add @${item.namespace}/${item.name}@${item.version}`,
      prompt: `Install @${item.namespace}/${item.name}@${item.version} from Modulora. Verify the published digest before changing files and show me the install plan first.`,
      "own-registry": item.otherCliCommand ?? "",
    }),
    [item],
  );

  const enabledInstallTabs = isCommercialSource
    ? []
    : [
        ...(item.distributionChannels?.includes("shadcn") ? ["shadcn"] : []),
        ...(item.distributionChannels?.includes("modulora-cli") ? ["modulora-cli"] : []),
        ...(item.distributionChannels?.includes("compatible-cli") && item.otherCliCommand ? ["own-registry"] : []),
        "prompt",
      ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        {item.moderationState ? (
          <div role="status" className="rounded-lg border border-ticket/40 bg-ticket/10 p-4 text-sm">
            {item.moderationState === "removed"
              ? "This listing was removed following a moderation decision. Installs are disabled and it no longer appears in browse. Removal reflects a listing decision on a specific report, not a legal or factual finding."
              : "This listing is temporarily restricted while a moderation report is reviewed. It doesn't appear in browse and installs are paused. A restriction is not a finding against the creator."}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            Listed by <Link to="/$username" params={{ username: item.namespace }} className="rounded-sm text-foreground/80 underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">@{item.namespace}</Link>{listedDate ? <> on <time dateTime={item.listedAt}>{listedDate}</time></> : null}
            {item.memberOf?.length ? (
              <>
                {" "}in <Link to="/$username" params={{ username: item.namespace }} className="text-foreground/80 hover:text-foreground">{item.memberOf[0]!.title}</Link>
              </>
            ) : null}
          </span>
          <span>·</span><span>v{item.version}</span><span>·</span><span className="capitalize">{item.framework}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
            {item.description ? <p className="mt-2 max-w-3xl text-pretty text-muted-foreground">{item.description}</p> : null}
          </div>
          <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm" className="size-11 sm:size-8">
            <a
              href={`https://x.com/intent/post?text=${encodeURIComponent(`${item.title} by @${item.namespace} on Modulora\n\nhttps://modulora.dev/components/${item.namespace}/${item.name}`)}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Share on X"
            >
              <XIcon />
            </a>
          </Button>
          <SaveMenu namespace={item.namespace} name={item.name} plus={viewerPlus} />
          <PriceSeal
            size="md"
            paid={isPaid}
            label={isPaid ? item.purchase?.priceLabel ?? "Paid" : "Free"}
          />
          </div>
        </div>
      </header>
      {purchaseReturnError ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{purchaseReturnError}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-3">
          <div>
            {isCommercialSource ? (
              <CommercialTray item={item} />
            ) : locked ? (
              <BuyTray item={item} />
            ) : item.ownedPurchase ? (
              <div className="flex flex-col gap-3">
                <OwnedTray owned={item.ownedPurchase} />
                <InstallTray
                  tabs={enabledInstallTabs}
                  active={installTab}
                  onActive={setInstallTab}
                  commands={commands}
                />
              </div>
            ) : (
              <InstallTray
                tabs={enabledInstallTabs}
                active={installTab}
                onActive={setInstallTab}
                commands={commands}
              />
            )}
          </div>

          <div>
            <Tabs.Root value={workspaceTab} onValueChange={setWorkspaceTab} className="overflow-hidden rounded-xl border border-border/60 bg-code-background text-code-foreground">
              <div className="flex flex-col gap-2 border-b border-border/60 px-3 py-2 sm:min-h-12 sm:flex-row sm:items-center sm:justify-between sm:py-0">
                <Tabs.List className="flex items-center gap-1">
                  <WorkspaceTab value="preview" icon={PackageCheck}>Preview</WorkspaceTab>
                  <WorkspaceTab value="code" icon={Code2}>{isCommercialSource ? "Code" : "Raw code"}</WorkspaceTab>
                </Tabs.List>
                {workspaceTab === "preview" ? (
                  <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-0.5 sm:overflow-visible sm:pb-0">
                    {demos.length > 1 ? (
                      <select
                        value={activeDemo}
                        onChange={(event) => setActiveDemo(event.target.value)}
                        aria-label="Demo variant"
                        className="h-11 shrink-0 rounded-md border border-border/60 bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 sm:h-7"
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
                <div ref={previewStageRef} className={`flex h-[32rem] items-center justify-center overflow-auto bg-code-background sm:h-[38rem] ${previewTheme === "dark" ? "[color-scheme:dark]" : "[color-scheme:light]"}`}>
                  <div className={`w-full transition-[max-width] [transition-duration:var(--motion-control-duration)] [transition-timing-function:var(--ease-out-exact)] ${demos.length > 0 && activeDemo ? "h-full" : ""} ${viewport === "mobile" ? "max-w-[390px]" : viewport === "tablet" ? "max-w-[768px]" : "max-w-none"}`}>
                    {demos.length > 0 && activeDemo ? (
                      <ComponentSandbox
                        key={previewKey}
                        files={item.files ?? []}
                        selectedDemo={activeDemo}
                        theme={previewTheme}
                        className="h-full w-full"
                        interactionHint={interactionHint}
                      />
                    ) : (
                      <ComponentPreview key={previewKey} item={item} theme={previewTheme} interactive className="min-h-[30rem] w-full" />
                    )}
                  </div>
                </div>
              </Tabs.Content>
              <Tabs.Content value="code" className="relative outline-none">
                {isCommercialSource || locked ? <LockedCode item={item} /> : <SourceFiles item={item} files={files} themeId={viewerTheme} />}
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          {typeof item.installCount === "number" ? (
            <FactCard label="Verified CLI installs" value={item.installCount.toLocaleString()} icon={Terminal} />
          ) : null}
          <FactCard label="License" value={item.license.kind === "spdx" ? item.license.spdxExpression : item.license.kind} icon={FileLock2} />
          <div className="rounded-xl border border-border/60 bg-card/35 p-4">
            <div className="mb-3 flex items-center gap-2"><ShieldCheck className="size-4" /><h2 className="text-sm font-semibold">Provenance &amp; integrity</h2></div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {isCommercialSource
                ? "Modulora hosts no source or install artifact for this release. The records below cover only the facts they name — not the creator-fulfilled code."
                : "Installs copy exactly these files and never run install scripts. Each record below is scoped to this release and independently checkable — not a guarantee the code is safe to run."}
            </p>
            <TooltipProvider delayDuration={150}>
              <div className="flex flex-col divide-y divide-border/60">
                {item.evidence.map((record, index) => <EvidenceRow key={`${record.type}-${index}`} record={record} />)}
              </div>
            </TooltipProvider>
          </div>
          {item.source ? (
            <a href={item.source.repository} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              Source repository <ExternalLink className="size-3.5" />
            </a>
          ) : null}
          <ReportComponent namespace={item.namespace} name={item.name} />
        </aside>
      </div>
    </div>
  );
}

function WorkspaceTab({ value, icon: Icon, children }: { value: string; icon: typeof Code2; children: ReactNode }) {
  return (
    <Tabs.Trigger value={value} className="flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=active]:bg-accent data-[state=active]:text-foreground sm:min-h-8">
      <Icon className="size-3.5" />{children}
    </Tabs.Trigger>
  );
}


function SourceFiles({ item, files, themeId }: { item: CatalogItem; files: HighlightedFile[]; themeId: string }) {
  const [active, setActive] = useState(files[0]?.path ?? "");

  if (files.length === 0) {
    return (
      <div className="flex h-[32rem] items-center justify-center bg-code-background px-6 text-center text-sm text-muted-foreground sm:h-[38rem]">
        Source for {item.title} is published with each release.
      </div>
    );
  }

  const current = files.find((file) => file.path === active) ?? files[0]!;

  return (
    <div className="grid h-[32rem] grid-rows-[10rem_1fr] bg-code-background sm:h-[38rem] sm:grid-cols-[13rem_1fr] sm:grid-rows-1">
      <div className="flex min-h-0 flex-col overflow-y-auto border-b border-border/60 p-2 sm:border-b-0 sm:border-r">
        <span className="px-2 pb-1 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          {files.length} file{files.length === 1 ? "" : "s"}
        </span>
        <FileTree
          nodes={buildFileTree(files.map((file) => file.path))}
          activePath={current.path}
          onSelect={setActive}
          depth={0}
        />
      </div>
      <div className="relative min-w-0 overflow-hidden">
        <div className="absolute right-3 top-3 z-10"><CopyButton value={current.raw} /></div>
        <div className="absolute inset-0">
          <CodeEditor key={current.path} path={current.path} value={current.raw} themeId={themeId} readOnly />
        </div>
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
            className={`flex min-h-11 items-center gap-2 rounded-md pr-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:min-h-10 ${node.path === activePath ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
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

function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

function BuyButton({ item, children }: { item: CatalogItem; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const license = item.marketplaceLicense;

  async function onBuy() {
    setBusy(true);
    setError(null);
    try {
      const res = await buyComponent({ data: { namespace: item.namespace, name: item.name, acceptLicense: agreed } });
      if (res.ok && res.url) {
        window.location.href = res.url;
        return;
      }
      setError(res.error ?? "Could not start checkout.");
    } catch {
      setError("Could not reach checkout. Please try again.");
    }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setAgreed(false); setError(null); } }}>
      <DialogTrigger asChild>
        <Button className="gap-2">{children}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>License terms</DialogTitle>
          <DialogDescription>
            {license?.name ?? "Seller license"} — agree to the seller&apos;s terms to continue. Your agreement is recorded with the purchase.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border/60 bg-secondary/20 p-3">
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">{license?.text || "The seller has not provided license text."}</pre>
        </div>
        <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md py-2 text-sm focus-within:ring-2 focus-within:ring-ring/50">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-5 accent-foreground" />
          <span>I agree to the seller&apos;s license terms for this component.</span>
        </label>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          This license is between you and the seller. Modulora records the agreement and facilitates the sale, but is not a party to — and does not enforce — its terms.
        </p>
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        <Button onClick={onBuy} disabled={busy || !agreed} className="mt-3 w-full gap-2">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Agree &amp; {typeof children === "string" ? children : "buy"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function BuyTray({ item }: { item: CatalogItem }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/35 p-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-medium">Buy to install</p>
        <p className="mt-1 text-xs text-muted-foreground">One-time purchase unlocks the source and install for your account.</p>
      </div>
      <BuyButton item={item}>Buy {formatPrice(item.marketplacePrice ?? 0)}</BuyButton>
    </div>
  );
}

function LockedCode({ item }: { item: CatalogItem }) {
  const marketplace = item.marketplacePrice != null;
  return (
    <div className="relative h-[32rem] overflow-hidden bg-code-background sm:h-[38rem]">
      <pre aria-hidden className="select-none p-5 font-mono text-sm leading-7 text-muted-foreground blur-[5px]">{`export function ${item.title.replace(/\s/g, "")}() {\n  // ${marketplace ? "Source unlocks after purchase" : "Paid component — delivered on purchase"}\n  return <PremiumComponent />\n}\n`.repeat(5)}</pre>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 px-6 text-center backdrop-blur-[2px]">
        <span className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/60"><FileLock2 className="size-5" /></span>
        {marketplace ? (
          <>
            <div><p className="font-semibold">Purchase to view the source</p><p className="mt-1 max-w-xs text-sm text-muted-foreground">This component is sold on Modulora. Buying unlocks the source and install for your account.</p></div>
            <BuyButton item={item}>Buy {formatPrice(item.marketplacePrice ?? 0)}</BuyButton>
          </>
        ) : (
          <>
            <div><p className="font-semibold">Paid component</p><p className="mt-1 max-w-xs text-sm text-muted-foreground">Purchase and fulfillment are handled by the creator. Modulora hosts no source and has not assessed it. {externalDomainDisclosure(verifiedDomainTimestamp(item))}</p></div>
            {item.purchase ? <Button asChild className="w-full sm:w-auto"><a href={item.purchase.url} target="_blank" rel="noreferrer">View on {item.purchase.domain}<ExternalLink /></a></Button> : null}
          </>
        )}
      </div>
    </div>
  );
}

function InstallTray({ tabs, active, onActive, commands }: { tabs: string[]; active: string; onActive: (value: string) => void; commands: Record<string, string> }) {
  return (
    <Tabs.Root value={active} onValueChange={onActive} className="overflow-hidden rounded-xl border border-border/60 bg-card/35">
      <div className="flex items-center gap-1 border-b border-border/60 px-2 py-2 sm:px-3">
        <Tabs.List className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              onClick={() => onActive(tab)}
              className="flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=active]:bg-accent data-[state=active]:text-foreground sm:min-h-8 [&_svg]:size-3.5"
            >
              <InstallTabIcon tab={tab} />
              {tab === "modulora-cli" ? "Modulora CLI" : tab === "shadcn" ? "shadcn" : tab === "own-registry" ? "Creator's registry" : "Prompt"}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <CopyButton value={commands[active] ?? ""} />
      </div>
      {tabs.map((tab) => <Tabs.Content key={tab} value={tab} className="outline-none"><pre className="overflow-x-auto bg-code-background p-4 font-mono text-sm text-code-foreground"><code className="block min-w-max">{commands[tab]}</code></pre></Tabs.Content>)}
    </Tabs.Root>
  );
}

function InstallTabIcon({ tab }: { tab: string }) {
  if (tab === "shadcn") return <ShadcnIcon />;
  if (tab === "modulora-cli") return <Logo />;
  if (tab === "own-registry") return <ExternalLink />;
  return <Sparkles />;
}

function CommercialTray({ item }: { item: CatalogItem }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/35 p-4 sm:flex-row sm:items-center">
      <div><p className="text-sm font-medium">Available from the creator</p><p className="mt-1 text-xs text-muted-foreground">No source or install artifact is distributed by Modulora. {externalDomainDisclosure(verifiedDomainTimestamp(item))}</p></div>
      {item.purchase ? <Button asChild className="w-full sm:w-auto"><a href={item.purchase.url} target="_blank" rel="noreferrer">View on {item.purchase.domain}{item.purchase.priceLabel ? ` · ${item.purchase.priceLabel}` : ""}<ExternalLink /></a></Button> : null}
    </div>
  );
}

function verifiedDomainTimestamp(item: CatalogItem): string | null {
  return item.evidence.find((record) => record.type === "domain-verified" && record.status === "passed")?.timestamp ?? null;
}

function ReportComponent({ namespace, name }: { namespace: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]!.id);
  const [details, setDetails] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setPending(true);
    setError(null);
    try {
      const result = await reportComponent({ data: { namespace, name, reason, details, reporterEmail } });
      if (!result.ok) {
        setError(result.error ?? "Could not submit.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not submit the report. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setDone(false); setError(null); setDetails(""); setReporterEmail(""); } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full text-muted-foreground hover:border-destructive/40 hover:text-destructive">
          <Flag /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-receipt/10 text-receipt"><Check className="size-5" /></span>
            <div><p className="font-semibold">Report recorded</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">Check your email to confirm this address for follow-up. The report stays on file even if you do not confirm it.</p></div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report this component</DialogTitle>
              <DialogDescription>Flag @{namespace}/{name} for suspected copied source, license abuse, unauthorized association, or another issue.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="report-reason">Reason</Label>
                <select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-11 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-9">
                  {REPORT_REASONS.map((r) => <option key={r.id} value={r.id} className="bg-popover">{r.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="report-details">Details <span className="text-muted-foreground">(optional)</span></Label>
                <textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} placeholder="Links, original source, context…" className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="report-email">Contact email <span className="text-muted-foreground">(required without an account)</span></Label>
                <Input id="report-email" type="email" autoComplete="email" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} placeholder="you@example.com" />
                <p className="text-xs text-muted-foreground">Used only to follow up on this report. We send a case-specific confirmation link; signed-in reporters can leave this blank.</p>
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
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const label = status === "copied" ? "Copied" : status === "error" ? "Copy failed" : "Copy";

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 1400);
  }

  return <Button type="button" variant="ghost" size="sm" aria-label={label} onClick={copy} className="min-w-11 shrink-0 px-2 text-muted-foreground hover:text-foreground">{status === "copied" ? <Check /> : status === "error" ? <X /> : <Copy />}<span className="hidden sm:inline">{label}</span></Button>;
}

function FactCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Terminal }) {
  return <div className="rounded-xl border border-border/60 bg-card/35 p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Icon className="size-3.5" /></div><p className="mt-2 text-2xl font-bold tracking-tight">{value}</p></div>;
}

function EvidenceRow({ record }: { record: EvidenceRecord }) {
  const passed = record.status === "passed";
  const leadIcon = passed ? (
    <span className="mt-0.5 text-receipt"><HiCheckBadge aria-hidden size={18} /></span>
  ) : record.status === "warning" ? (
    <span className="mt-0.5 flex size-[18px] items-center justify-center rounded-full bg-secondary text-muted-foreground"><TriangleAlert className="size-3" /></span>
  ) : record.status === "failed" ? (
    <span className="mt-0.5 flex size-[18px] items-center justify-center rounded-full bg-destructive/15 text-destructive"><X className="size-3" /></span>
  ) : (
    <span className="mt-0.5 flex size-[18px] items-center justify-center rounded-full bg-secondary text-muted-foreground"><Clipboard className="size-3" /></span>
  );

  const body = (
    <div className="min-w-0">
      <p className="text-xs font-medium">{EVIDENCE_LABELS[record.type] ?? record.type}</p>
      <p className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{record.scope ?? record.limitations ?? record.issuer}</p>
    </div>
  );

  return (
    <div className="flex gap-2.5 py-3 first:pt-0 last:pb-0">
      {record.limitations ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label={`What ${EVIDENCE_LABELS[record.type] ?? record.type} proves`} className="flex size-11 shrink-0 cursor-help items-start justify-center rounded-md pt-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50">{leadIcon}</button>
          </TooltipTrigger>
          <TooltipContent side="left">{record.limitations}</TooltipContent>
        </Tooltip>
      ) : (
        <span className="flex size-11 shrink-0 items-start justify-center pt-2">{leadIcon}</span>
      )}
      {body}
    </div>
  );
}
