import { useEffect, useState } from "react";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { HiArrowRight as ArrowRight, HiChartBar as BarChart3, HiSquaresPlus as Blocks, HiBuildingLibrary as Library, HiGlobeAlt as Globe, HiShieldCheck as ShieldCheck, HiUserCircle as UserRound } from "react-icons/hi2";

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
  receipt?: boolean;
};

const CONTENT_TYPES: ContentType[] = [
  { label: "Listings", icon: Blocks, key: "listings" },
  { label: "Collections", icon: Library, key: "libraries" },
  { label: "Verified installs", icon: ShieldCheck, key: "verifiedInstalls", receipt: true },
];

function Dashboard() {
  const summary = layoutRoute.useLoaderData();
  const { user } = layoutRoute.useRouteContext();
  const displayName = user?.name?.trim() ? user.name : summary.namespace;
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Overview"
        description={<LocalGreeting name={displayName} />}
      />

      <div className="grid w-full gap-4 sm:grid-cols-3">
        {CONTENT_TYPES.map((type) => (
          <StatCard key={type.label} icon={type.icon} label={type.label} value={summary.counts[type.key]} receipt={type.receipt} />
        ))}
      </div>

      {!journeyComplete(summary.journey) ? (
        <div className="w-full">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Create">
          <ActionRow
            icon={Blocks}
            title="Component"
            description="Publish reusable UI source for curator review."
            to="/dashboard/new"
          />
          <ActionRow
            icon={Globe}
            title="Tool or site"
            description="List an owner-authorized resource from a domain you control."
            to="/dashboard/tools/new"
          />
        </Panel>

        <Panel title="Reach">
          <ActionRow
            icon={BarChart3}
            title="Analytics"
            description="See views and digest-verified installs."
            to="/dashboard/analytics"
          />
          <ActionRow
            icon={UserRound}
            title="Public profile"
            description={
              summary.namespace
                ? `Preview modulora.dev/${summary.namespace}.`
                : "Claim a namespace and publish your profile."
            }
            to={summary.namespace ? "/$username" : undefined}
            params={summary.namespace ? { username: summary.namespace } : undefined}
          />
        </Panel>
      </div>
    </div>
  );
}

function LocalGreeting({ name }: { name?: string | null }) {
  const [greeting, setGreeting] = useState("Hey");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 18 ? "Good afternoon" : hour >= 18 && hour < 23 ? "Good evening" : "Hey");
  }, []);

  return <>{greeting}{name ? <>, <span className="text-foreground">{name}</span></> : null}.</>;
}

function StatCard({ icon: Icon, label, value, receipt = false }: { icon: typeof Blocks; label: string; value: number; receipt?: boolean }) {
  return (
    <div className="flex min-h-32 flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`flex size-8 items-center justify-center rounded-lg ${receipt ? "bg-receipt/10 text-receipt" : "bg-secondary text-muted-foreground"}`}><Icon className="size-4" /></span>
      </div>
      <span className={`text-3xl font-bold tabular-nums tracking-tight ${receipt ? "text-receipt" : ""}`}>{value}</span>
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
  to?: "/dashboard/new" | "/dashboard/tools/new" | "/$username" | "/dashboard/analytics";
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
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" />
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
    <Link to={to} params={params as never} className="group flex min-h-11 items-center gap-3 rounded-lg px-2 py-2.5 transition-[background-color,transform] [transition-duration:var(--motion-control-duration)] [transition-timing-function:var(--ease-out-exact)] hover:translate-x-0.5 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transform-none motion-reduce:transition-none">
      {inner}
    </Link>
  );
}
