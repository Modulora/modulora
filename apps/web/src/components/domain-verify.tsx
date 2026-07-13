/**
 * Domain verification surfaces, in Modulora's own design language.
 *
 * - DnsRecordCard: the single ownership TXT record as full-width
 *   click-to-copy rows with a status chip — no generic table chrome.
 * - OneClickSetup: the Domain Connect handoff panel. Render it only after
 *   real discovery says the user's DNS provider supports our template —
 *   never show a button that can't work.
 */
import { useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { ProviderButton, ProviderLogo, resolveDnsProvider } from "@/components/dns-providers";

/* ── Record card ─────────────────────────────────────────── */

export type DnsRecordStatus = "pending" | "valid" | "invalid";

export interface DnsRecordInfo {
  type: string;
  name: string;
  value: string;
  status: DnsRecordStatus;
  /** Shown under the rows when a check found a concrete problem. */
  issue?: string;
}

const statusChip: Record<DnsRecordStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-500" },
  valid: { label: "Verified", className: "bg-receipt/10 text-receipt" },
  invalid: { label: "Mismatch", className: "bg-destructive/10 text-destructive" },
};

export function DnsRecordCard({ record }: { record: DnsRecordInfo }) {
  const chip = statusChip[record.status];
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-secondary/30 px-3 py-2">
        <span className="font-mono text-[11px] font-semibold tracking-wide text-muted-foreground">
          {record.type} record
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.className}`}>
          {chip.label}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border/40">
        <CopyRow label="Name" value={record.name} />
        <CopyRow label="Value" value={record.value} />
      </div>
      {record.issue ? (
        <p className="border-t border-border/60 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
          {record.issue}
        </p>
      ) : (
        <p className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground/70">
          DNS changes can take a few minutes to propagate. Keep the values exactly as shown.
        </p>
      )}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      aria-label={`Copy ${label}`}
      className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary/40"
    >
      <span className="w-11 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/60">
        {label}
      </span>
      <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed">
        {value}
      </code>
      <span className="shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground">
        {copied ? <Check className="size-3.5 text-receipt" /> : <Copy className="size-3.5" />}
      </span>
    </button>
  );
}

/* ── One-click Domain Connect handoff ────────────────────── */

export function OneClickSetup({
  domain,
  provider,
  onConnect,
  connecting = false,
  error,
}: {
  domain: string;
  provider: string;
  onConnect: () => void;
  connecting?: boolean;
  error?: string;
}) {
  const brand = resolveDnsProvider(provider);
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary/60">
          {brand ? (
            <ProviderLogo provider={brand} className="size-4.5" />
          ) : (
            <ShieldCheck className="size-4 text-receipt" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Set up DNS automatically</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {provider} supports one-click setup for {domain}. You&apos;ll review the exact record
            at {provider} before anything is applied.
          </p>
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
          <div className="mt-3">
            <ProviderButton
              provider={brand}
              label={connecting ? "Connecting…" : `Continue to ${provider}`}
              disabled={connecting}
              onClick={onConnect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
