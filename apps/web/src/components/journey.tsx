/**
 * The earning journey — shown on the dashboard Overview until a creator has
 * completed the path: publish → get approved → connect payouts → set a
 * price. Driven by real state, never fake progress. Rendered as a horizontal
 * stepper (reui c-stepper-11 pattern: bar indicators + titles) with the
 * active step's description and a real action link below. Presentational
 * (Storybook-safe).
 */
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper";
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
    title: "Publish",
    description: "Build your first component in the editor with a live preview, then submit it for review.",
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
    description: "One Stripe account for both earning streams — takes about two minutes.",
    href: "/dashboard/payouts",
    action: "Set up payouts",
  },
  {
    key: "priced",
    title: "Sell",
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
      <a
        href={href}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent/60"
      >
        {children}
      </a>
    ));
  const doneCount = JOURNEY_STEPS.filter((step) => journey[step.key]).length;
  const firstIncomplete = JOURNEY_STEPS.findIndex((step) => !journey[step.key]);
  const activeIndex = firstIncomplete === -1 ? JOURNEY_STEPS.length - 1 : firstIncomplete;
  const active = JOURNEY_STEPS[activeIndex]!;

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Start earning on Modulora</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{doneCount}/{JOURNEY_STEPS.length}</span>
      </div>

      <Stepper value={activeIndex + 1} className="mt-5 w-full">
        <StepperNav className="gap-3">
          {JOURNEY_STEPS.map((step, index) => (
            <StepperItem key={step.key} step={index + 1} className="relative flex-1 items-start">
              {/* Status display, not navigation — journey state comes from data. */}
              <StepperTrigger className="pointer-events-none flex grow flex-col items-start justify-center gap-2" tabIndex={-1}>
                <StepperIndicator className="h-1 w-full rounded-full bg-border data-[state=active]:bg-foreground data-[state=completed]:bg-emerald-500">
                  <span className="sr-only">{index + 1}</span>
                </StepperIndicator>
                <StepperTitle className="text-start text-xs font-medium group-data-[state=inactive]/step:text-muted-foreground/60">
                  {step.title}
                </StepperTitle>
              </StepperTrigger>
            </StepperItem>
          ))}
        </StepperNav>
      </Stepper>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-secondary/40 px-3.5 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">{active.description}</p>
        {link(
          active.href,
          <>
            {active.action} <ArrowRight className="size-3" />
          </>,
        )}
      </div>
    </div>
  );
}
