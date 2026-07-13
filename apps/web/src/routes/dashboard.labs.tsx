/** Labs — feature rollout stages. Plus subscribers get plus-early flags. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { FlaskConical, Sparkles } from "lucide-react";
import { FLAGS, hasFeature } from "@/lib/flags";
import { fetchCurrentUser } from "@/lib/session";

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
      <div className="flex items-center gap-2">
        <FlaskConical className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Labs</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Features roll out in stages: off → early (Plus) → everyone.
        {!plus ? (
          <>
            {" "}
            <Link to="/pricing" className="text-foreground underline underline-offset-2">Plus subscribers get them first</Link>.
          </>
        ) : null}
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {flags.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{flag.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{flag.description}</p>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                flag.active
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : flag.stage === "plus-early"
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
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
