/** Labs — feature rollout stages. Plus subscribers get plus-early flags. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { HiBeaker as FlaskConical, HiSparkles as Sparkles } from "react-icons/hi2";

import { FLAGS, hasFeature } from "@/lib/flags";
import { fetchCurrentUser } from "@/lib/session";
import { DashboardPageHeader } from "@/components/dashboard-page-header";

const fetchLabs = createServerFn({ method: "GET" }).handler(async () => {
  const user = await fetchCurrentUser();
  return {
    plus: user?.isPlus ?? false,
    flags: FLAGS.map((flag) => ({ ...flag, active: hasFeature(user, flag.key) })),
  };
});

export const Route = createFileRoute("/dashboard/labs")({
  loader: () => fetchLabs(),
  component: LabsPage,
});

function LabsPage() {
  const { plus, flags } = Route.useLoaderData();
  return (
    <div className="w-full max-w-3xl">
      <DashboardPageHeader
        title="Labs"
        icon={FlaskConical}
        description={<>Features roll out in stages: off → early (Plus) → everyone.{!plus ? (
          <>
            {" "}
            <Link to="/pricing" className="text-foreground underline underline-offset-2">Plus subscribers get them first</Link>.
          </>
        ) : null}</>}
      />
      <div className="mt-8 flex flex-col gap-3">
        {flags.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{flag.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{flag.description}</p>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                flag.active
                  ? "border-receipt/30 bg-receipt/10 text-receipt"
                  : flag.stage === "plus-early"
                    ? "border-border/60 bg-secondary text-muted-foreground"
                    : "border-border/60 text-muted-foreground"
              }`}
            >
              {flag.stage === "plus-early" ? <Sparkles className="size-2.5" /> : null}
              {flag.active ? "active" : flag.stage === "plus-early" ? "plus early" : "coming"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
