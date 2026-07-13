/**
 * Buyer-side ownership surfaces — presentational only (Storybook-safe).
 * OwnedTray: the "You own this" moment on a purchased component's page.
 * PurchasesList: the owned-components library.
 */
import { useState } from "react";
import { LiveCardPreview } from "@/components/live-card-preview";
import { BadgeCheck, Bot, Check, Copy, FileText, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buildAgentPrompt } from "@/lib/agent-prompt";
import { publicRepoPolicy } from "@/lib/license";
import type { OwnedComponent } from "@/lib/purchases";

function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  return [
    copied,
    (text: string) => {
      void navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    },
  ];
}

export function CopyChip({ label, text, icon: Icon }: { label: string; text: string; icon: typeof Copy }) {
  const [copied, copy] = useCopy();
  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copy(text)}>
      {copied ? <Check className="size-3.5 text-receipt" /> : <Icon className="size-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function LicenseDialog({
  licenseText,
  acceptedAt,
  trigger,
}: {
  licenseText: string | null;
  acceptedAt: string | null;
  trigger?: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <FileText className="size-3.5" /> License
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Your license</DialogTitle>
          <DialogDescription>
            The exact terms you agreed to at purchase
            {acceptedAt ? ` on ${new Date(acceptedAt).toLocaleDateString()}` : ""}. This copy is recorded with your purchase.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-border/60 bg-secondary/20 p-3">
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">
            {licenseText || "No license text was recorded for this purchase."}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The post-purchase moment on a component page. */
export function OwnedTray({ owned }: { owned: OwnedComponent }) {
  const installCommand = `npx modulora add @${owned.namespace}/${owned.name}`;
  const agentPrompt = buildAgentPrompt({
    namespace: owned.namespace,
    name: owned.name,
    title: owned.title,
    description: owned.description,
    owned: true,
    publicRepoPolicy: publicRepoPolicy(owned.licenseTemplate),
  });
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-receipt/25 bg-receipt/[0.04] p-4">
      <div className="flex items-center gap-2">
        <BadgeCheck className="size-4 text-receipt" />
        <p className="text-sm font-medium">You own this component</p>
        <span className="text-xs text-muted-foreground">
          purchased {new Date(owned.purchasedAt).toLocaleDateString()}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
        <code className="truncate font-mono text-xs text-muted-foreground">{installCommand}</code>
        <CopyChip label="Copy" text={installCommand} icon={TerminalSquare} />
      </div>
      <div className="flex items-center gap-2">
        <CopyChip label="Copy prompt for your agent" text={agentPrompt} icon={Bot} />
        <LicenseDialog licenseText={owned.licenseText} acceptedAt={owned.licenseAcceptedAt} />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Sign in first with <code className="font-mono">npx modulora login</code> — purchased source is tied to your account. The CLI verifies the content digest on every install.
        {publicRepoPolicy(owned.licenseTemplate) === "forbidden" ? (
          <> <span className="text-amber-500">This license doesn&apos;t allow committing the source to public repositories</span> — keep it in private repos; the agent prompt includes this restriction.</>
        ) : publicRepoPolicy(owned.licenseTemplate) === "unknown" ? (
          <> Custom license terms — check them before committing this source to a public repository.</>
        ) : null}
      </p>
    </div>
  );
}

/** The owned-components library (dashboard → Purchases). */
export function PurchasesList({ purchases }: { purchases: OwnedComponent[] }) {
  return (
    <div className="flex flex-col gap-3">
      {purchases.map((owned) => (
        <PurchaseRow key={owned.id} owned={owned} />
      ))}
    </div>
  );
}

function PurchaseRow({ owned }: { owned: OwnedComponent }) {
  const installCommand = `npx modulora add @${owned.namespace}/${owned.name}`;
  const agentPrompt = buildAgentPrompt({
    namespace: owned.namespace,
    name: owned.name,
    title: owned.title,
    description: owned.description,
    owned: true,
    publicRepoPolicy: publicRepoPolicy(owned.licenseTemplate),
  });
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/35 p-4 sm:flex-row sm:items-center sm:justify-between">
      <LiveCardPreview
        item={{ namespace: owned.namespace, name: owned.name, title: owned.title, live: true }}
        className="w-28 shrink-0 max-sm:hidden"
      />
      <div className="min-w-0 sm:flex-1">
        <div className="flex items-center gap-2">
          <a href={`/components/${owned.namespace}/${owned.name}`} className="truncate text-sm font-medium hover:underline">
            {owned.title}
          </a>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">${(owned.amount / 100).toFixed(2)}</span>
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          @{owned.namespace}/{owned.name} · {new Date(owned.purchasedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <CopyChip label="Install" text={installCommand} icon={TerminalSquare} />
        <CopyChip label="Agent prompt" text={agentPrompt} icon={Bot} />
        <LicenseDialog licenseText={owned.licenseText} acceptedAt={owned.licenseAcceptedAt} />
      </div>
    </div>
  );
}

export function PurchasesEmptyState() {
  return (
    <EmptyState
      icon={BadgeCheck}
      title="No purchases yet"
      description="Components you buy appear here with their install command, an integrate prompt for your coding agent, and the license you agreed to."
    />
  );
}
