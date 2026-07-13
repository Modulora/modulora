/**
 * Money-flow building blocks — presentational only, shared by the Sell dialog
 * and Storybook. Pricing math comes from lib/pricing (client-safe constants).
 */
import { useState } from "react";
import { creatorNet, platformFee, MARKETPLACE_FEE_PERCENT } from "@/lib/pricing";
import { SPLIT } from "@/lib/profit-share";
import { Donut } from "@/components/donut";
import { Input } from "@/components/ui/input";
import { LICENSE_TEMPLATES } from "@/lib/license";

/**
 * Free/Paid badge as a little ticket — a rounded rect with notches punched
 * into each end (.ticket-pill mask) and a faint paper-noise overlay. Amber
 * ticket = costs money; muted = free.
 */
export function PriceSeal({ paid, label, size = "sm" }: { paid: boolean; label?: string; size?: "sm" | "md" }) {
  const text = label ?? (paid ? "Paid" : "Free");
  return (
    <span
      className={`ticket-pill relative inline-flex shrink-0 items-center justify-center overflow-hidden font-semibold tabular-nums ${
        size === "md" ? "px-4 py-1.5 text-xs" : "px-3.5 py-1 text-xs"
      } ${paid ? "bg-ticket text-ticket-foreground" : "bg-secondary text-muted-foreground"}`}
    >
      {text}
      <span aria-hidden className="ticket-texture pointer-events-none absolute inset-0" />
    </span>
  );
}


export function EarningsBreakdown({ dollars }: { dollars: string }) {
  const cents = Math.round((parseFloat(dollars) || 0) * 100);
  if (cents <= 0) return null;
  const fee = platformFee(cents);
  const net = creatorNet(cents);
  const money = (c: number) => `$${(c / 100).toFixed(2)}`;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs">
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Buyer pays</span>
        <span className="tabular-nums">{money(cents)}</span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Modulora fee ({MARKETPLACE_FEE_PERCENT}%, incl. processing)</span>
        <span className="tabular-nums">−{money(fee)}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between border-t border-border/60 pt-1.5 font-medium text-foreground">
        <span>You earn</span>
        <span className="tabular-nums text-receipt">{money(net)}</span>
      </div>
    </div>
  );
}

export function LicensePicker({ template, setTemplate, text, setText }: { template: string; setTemplate: (v: string) => void; text: string; setText: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">Buyer license</p>
      <div className="flex flex-col gap-1.5">
        {LICENSE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTemplate(t.id)}
            className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${template === t.id ? "border-foreground/40 bg-secondary/40" : "border-border/60 hover:border-border"}`}
          >
            <span className="font-medium">{t.name}</span>
            {t.summary ? <span className="mt-0.5 block text-muted-foreground">{t.summary}</span> : null}
          </button>
        ))}
      </div>
      {template === "custom" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Your license terms. Buyers must agree to these before purchase."
          className="w-full rounded-lg border border-border/60 bg-transparent p-2.5 font-mono text-xs outline-none focus:border-foreground/40"
        />
      ) : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Buyers must agree to these terms before checkout; we record the agreement on every sale. Modulora doesn&apos;t enforce licenses, but we support you with sale documentation and agreement logs if you need them.
      </p>
    </div>
  );
}


/** The 60/30/10 split, as a donut with legend (docs + explainer pages). */
export function SplitDonut() {
  const segments = [
    { label: "Creators", value: SPLIT.creator, color: "var(--receipt)" },
    { label: "Open-source fund", value: SPLIT.ossFund, color: "var(--ticket)" },
    { label: "Modulora", value: SPLIT.modulora, color: "#52525b" },
  ];
  return (
    <div className="my-6 flex flex-col items-center gap-8 rounded-xl border border-border/60 p-8 sm:flex-row sm:justify-center sm:gap-12">
      <Donut
        segments={segments}
        size={180}
        center={
          <>
            <span className="text-2xl font-bold">100%</span>
            <span className="mt-0.5 max-w-[7rem] text-center text-xs leading-tight text-muted-foreground">of distributable profit</span>
          </>
        }
      />
      <ul className="flex flex-col gap-3">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-3">
            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-sm">
              <span className="font-semibold tabular-nums">{seg.value}%</span>{" "}
              <span className="text-muted-foreground">{seg.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Interactive: what a creator keeps on a direct marketplace sale. */
export function MarketplaceCalculator() {
  const [dollars, setDollars] = useState("29");
  const cents = Math.round((parseFloat(dollars) || 0) * 100);
  const money = (c: number) => `$${(c / 100).toFixed(2)}`;
  return (
    <div className="my-6 rounded-xl border border-border/60 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Price $</span>
          <Input value={dollars} onChange={(e) => setDollars(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className="h-9 w-28" />
        </label>
        <div className="flex flex-1 items-center justify-between gap-6 rounded-lg bg-secondary/30 px-4 py-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Modulora fee ({MARKETPLACE_FEE_PERCENT}%)</p>
            <p className="font-medium tabular-nums">{cents > 0 ? `−${money(platformFee(cents))}` : "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">You earn</p>
            <p className="text-lg font-bold tabular-nums text-receipt">{cents > 0 ? money(creatorNet(cents)) : "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Promoted badge ──────────────────────────────────────── */

/**
 * Marks paid placement in the catalog grid. Placement is the only thing
 * money buys — never trust — so the badge must read as an ad label, not
 * an endorsement. Coloring is still under review (tones exist to make
 * the revisit cheap).
 */
export function PromotedBadge({ tone = "amber" }: { tone?: "amber" | "neutral" }) {
  const tones = {
    amber: "border-ticket/25 bg-ticket/10 text-ticket-ink",
    neutral: "border-border/60 bg-background/80 text-muted-foreground",
  } as const;
  return (
    <span
      className={`absolute right-5 top-5 z-10 rounded-full border px-2 py-0.5 text-xs font-medium backdrop-blur ${tones[tone]}`}
    >
      Promoted
    </span>
  );
}
