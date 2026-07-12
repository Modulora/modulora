/**
 * Money-flow building blocks — presentational only, shared by the Sell dialog
 * and Storybook. Pricing math comes from lib/pricing (client-safe constants).
 */
import { creatorNet, platformFee, MARKETPLACE_FEE_PERCENT } from "@/lib/pricing";
import { LICENSE_TEMPLATES } from "@/lib/license";

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
        <span className="tabular-nums text-emerald-500">{money(net)}</span>
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
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Buyers must agree to these terms before checkout; we record the agreement on every sale. Modulora doesn&apos;t enforce licenses, but we support you with sale documentation and agreement logs if you need them.
      </p>
    </div>
  );
}
