import { createFileRoute, Link } from "@tanstack/react-router";
import { PROFIT_SHARE_MODEL, PROFIT_SHARE_VERSION, SPLIT } from "@/lib/profit-share";
import { Donut } from "@/components/donut";

const SPLIT_SEGMENTS = [
  { label: "Creators", value: SPLIT.creator, color: "#10b981" },
  { label: "Open-source fund", value: SPLIT.ossFund, color: "#f59e0b" },
  { label: "Modulora", value: SPLIT.modulora, color: "#52525b" },
];

export const Route = createFileRoute("/profit-share")({ component: ProfitShare });

function ProfitShare() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-14">
      <h1 className="text-3xl font-bold tracking-tight">Creator earnings &amp; profit share</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        How creators earn on Modulora. Version {PROFIT_SHARE_VERSION}. Plain-language summary — the binding
        version is the Creator Earnings Terms.
      </p>

      {/* Split visual */}
      <div className="mt-8 flex flex-col items-center gap-8 rounded-xl border border-border/60 p-8 sm:flex-row sm:justify-center sm:gap-12">
        <Donut
          segments={SPLIT_SEGMENTS}
          size={200}
          center={
            <>
              <span className="text-2xl font-bold">100%</span>
              <span className="mt-0.5 max-w-[7rem] text-[10px] leading-tight text-muted-foreground">of distributable profit</span>
            </>
          }
        />
        <ul className="flex flex-col gap-3">
          {SPLIT_SEGMENTS.map((seg) => (
            <li key={seg.label} className="flex items-center gap-3">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-2xl font-bold tabular-nums">{seg.value}%</span>
              <span className="text-sm text-muted-foreground">{seg.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 flex flex-col gap-8">
        {PROFIT_SHARE_MODEL.map((section, i) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold">
              <span className="mr-2 tabular-nums text-muted-foreground/50">{i + 1}.</span>
              {section.title}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {section.body.map((point) => (
                <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                  {point}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Ready to earn? <Link to="/settings" className="text-foreground underline underline-offset-2">Set up payouts</Link>{" "}
        and read the <Link to="/terms" className="text-foreground underline underline-offset-2">Terms</Link>.
      </p>
    </div>
  );
}
