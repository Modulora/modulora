/**
 * The earning journey checklist — shown on the dashboard Overview until a
 * creator has completed the path: publish → get approved → connect payouts →
 * set a price. Driven by real state, never fake progress. Presentational
 * (Storybook-safe); the current step's action is a real link.
 */
import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { StudioSummary } from "@/lib/studio";

export interface JourneyStepDef {
  key: keyof StudioSummary["journey"];
  title: string;
  description: string;
  href: string;
  action: string;
}

export const JOURNEY_STEPS: JourneyStepDef[] = [
  {
    key: "published",
    title: "Publish your first component",
    description: "Build it in the editor with a live preview, then submit for review.",
    href: "/dashboard/new",
    action: "New component",
  },
  {
    key: "approved",
    title: "Pass review",
    description: "A curator checks every submission before it lists publicly. You'll see the status on your components.",
    href: "/dashboard/components",
    action: "View status",
  },
  {
    key: "payouts",
    title: "Connect payouts",
    description: "One Stripe account for both streams — takes about two minutes.",
    href: "/dashboard/payouts",
    action: "Set up payouts",
  },
  {
    key: "priced",
    title: "Sell something",
    description: "Set a price on a component. You keep 90% of every sale.",
    href: "/dashboard/components",
    action: "Set a price",
  },
];

export function journeyComplete(journey: StudioSummary["journey"]): boolean {
  return JOURNEY_STEPS.every((step) => journey[step.key]);
}

export function JourneyChecklist({
  journey,
  renderLink,
}: {
  journey: StudioSummary["journey"];
  /** Router-aware link renderer; defaults to a plain anchor (Storybook). */
  renderLink?: (href: string, children: ReactNode) => ReactNode;
}) {
  const link =
    renderLink ??
    ((href: string, children: ReactNode) => (
      <a href={href} className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline">
        {children}
      </a>
    ));
  const doneCount = JOURNEY_STEPS.filter((step) => journey[step.key]).length;
  const activeIndex = JOURNEY_STEPS.findIndex((step) => !journey[step.key]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Start earning on Modulora</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{doneCount}/{JOURNEY_STEPS.length}</span>
      </div>
      <ol className="mt-4 flex flex-col gap-1">
        {JOURNEY_STEPS.map((step, i) => {
          const done = journey[step.key];
          const active = i === activeIndex;
          return (
            <li
              key={step.key}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${active ? "bg-secondary/40" : ""}`}
            >
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] tabular-nums ${
                  done
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500"
                    : active
                      ? "border-foreground/40 text-foreground"
                      : "border-border/60 text-muted-foreground/60"
                }`}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${done ? "text-muted-foreground line-through decoration-border" : active ? "font-medium" : "text-muted-foreground"}`}>
                  {step.title}
                </p>
                {active ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.description}</p> : null}
              </div>
              {active
                ? link(
                    step.href,
                    <>
                      {step.action} <ArrowRight className="size-3" />
                    </>,
                  )
                : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
