import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { HiArrowRight as ArrowRight, HiChartBar as BarChart3, HiSquaresPlus as Blocks, HiBuildingLibrary as Library, HiUserCircle as UserRound } from "react-icons/hi2";

import type { StudioSummary } from "@/lib/studio";
import { JourneyChecklist, journeyComplete } from "@/components/journey";
import { DashboardPageHeader } from "@/components/dashboard-page-header";

export const Route = createFileRoute("/dashboard/")({
  component: Dashboard,
});

const layoutRoute = getRouteApi("/dashboard");

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
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Overview"
        description={<>
          Welcome back
          {displayName ? (
            <>
              , <span className="text-foreground">{displayName}</span>
            </>
          ) : null}
          . Your work at a glance.
        </>}
      />

      {!journeyComplete(summary.journey) ? (
        <div className="max-w-2xl">
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
        </div>
      ) : null}

      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        {CONTENT_TYPES.map((type) => (
          <StatCard key={type.label} icon={type.icon} label={type.label} value={summary.counts[type.key]} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
      </div>
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
        <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      )}
    </>
  );

  if (disabled || !to) {
    return <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 opacity-70">{inner}</div>;
  }

  return (
    <Link to={to} params={params as never} className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
      {inner}
    </Link>
  );
}
