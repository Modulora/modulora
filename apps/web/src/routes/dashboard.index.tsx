/* ─────────────────────────────────────────────────────────
 * DASHBOARD OVERVIEW — entrance storyboard
 *
 * The sidebar lives in the /dashboard layout route and persists across
 * dashboard pages; this file is the Overview content only.
 *
 *    0ms   content hidden
 *  100ms   overview heading fades in
 *  180ms   stat cards rise, staggered 60ms each
 *  400ms   action panels fade in
 * ───────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, BarChart3, Blocks, Library, UserRound } from "lucide-react";
import type { StudioSummary } from "@/lib/studio";
import { JourneyChecklist, journeyComplete } from "@/components/journey";

export const Route = createFileRoute("/dashboard/")({
  component: Dashboard,
});

const layoutRoute = getRouteApi("/dashboard");

const TIMING = {
  heading: 100,
  stats: 180,
  panels: 400,
};

const RISE = {
  offsetY: 8,
  stagger: 0.06,
  spring: { type: "spring" as const, stiffness: 350, damping: 28 },
};

type ContentType = {
  label: string;
  icon: typeof Blocks;
  key: keyof StudioSummary["counts"];
};

const CONTENT_TYPES: ContentType[] = [
  { label: "Components", icon: Blocks, key: "components" },
  { label: "Libraries", icon: Library, key: "libraries" },
];

function Dashboard() {
  const summary = layoutRoute.useLoaderData();
  const { user } = layoutRoute.useRouteContext();
  const displayName = user?.name?.trim() ? user.name : summary.namespace;
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
    const timers = [
      setTimeout(() => setStage(1), TIMING.heading),
      setTimeout(() => setStage(2), TIMING.stats),
      setTimeout(() => setStage(3), TIMING.panels),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <motion.div
        initial={{ opacity: 0, y: RISE.offsetY }}
        animate={{ opacity: stage >= 1 ? 1 : 0, y: stage >= 1 ? 0 : RISE.offsetY }}
        transition={RISE.spring}
      >
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back
          {displayName ? (
            <>
              , <span className="text-foreground">{displayName}</span>
            </>
          ) : null}
          . Your work at a glance.
        </p>
      </motion.div>

      {!journeyComplete(summary.journey) ? (
        <motion.div
          initial={{ opacity: 0, y: RISE.offsetY }}
          animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : RISE.offsetY }}
          transition={RISE.spring}
          className="max-w-2xl"
        >
          <JourneyChecklist
            journey={summary.journey}
            renderLink={(href, children) => (
              <Link
                to={href}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent/60"
              >
                {children}
              </Link>
            )}
          />
        </motion.div>
      ) : null}

      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        {CONTENT_TYPES.map((type, i) => (
          <motion.div
            key={type.label}
            initial={{ opacity: 0, y: RISE.offsetY }}
            animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : RISE.offsetY }}
            transition={{ ...RISE.spring, delay: i * RISE.stagger }}
          >
            <StatCard icon={type.icon} label={type.label} value={summary.counts[type.key]} />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 3 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="grid gap-4 lg:grid-cols-2"
      >
        <Panel title="Publish">
          <ActionRow
            icon={Blocks}
            title="New component"
            description="Build with a live preview, then submit it for review."
            to="/dashboard/new"
          />
        </Panel>

        <Panel title="Track">
          <ActionRow
            icon={BarChart3}
            title="Analytics"
            description="Views and verified installs across your components."
            to="/dashboard/analytics"
          />
          <ActionRow
            icon={UserRound}
            title="Public profile"
            description={
              summary.namespace
                ? `Everything you publish, at modulora.dev/${summary.namespace}.`
                : "Claim a namespace to get a public profile."
            }
            to={summary.namespace ? "/$username" : undefined}
            params={summary.namespace ? { username: summary.namespace } : undefined}
          />
        </Panel>
      </motion.div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Blocks; label: string; value: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground/60" />
      </div>
      <span className="text-3xl font-bold tabular-nums tracking-tight">{value}</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/40 p-2">
      <h2 className="px-2 pb-1 pt-2 text-sm font-semibold">{title}</h2>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  title,
  description,
  to,
  params,
  disabled,
}: {
  icon: typeof Blocks;
  title: string;
  description: string;
  to?: "/dashboard/new" | "/$username" | "/dashboard/analytics";
  params?: { username: string };
  disabled?: boolean;
}) {
  const inner = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
        <Icon className="size-4" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      {!disabled ? (
        <ArrowRight className="size-4 text-muted-foreground" />
      ) : (
        <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      )}
    </>
  );

  if (disabled || !to) {
    return <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 opacity-70">{inner}</div>;
  }

  return (
    <Link to={to} params={params as never} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60">
      {inner}
    </Link>
  );
}
