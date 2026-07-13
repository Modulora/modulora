/** Persistent desktop navigation with a compact, collapsible mobile variant. */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Banknote,
  BarChart3,
  Blocks,
  Bookmark,
  ChevronDown,
  ClipboardCheck,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  Library,
  Plus,
  Settings,
  ShieldEllipsis,
  ShoppingBag,
  Sparkles,
  TerminalSquare,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StudioSummary } from "@/lib/studio";
import { DIRECT_MARKETPLACE_ENABLED } from "@/lib/flags";

const sectionLabels = [
  ["/dashboard/components", "Components"],
  ["/dashboard/lists", "Lists"],
  ["/dashboard/purchases", "Purchases"],
  ["/dashboard/collections", "Collections"],
  ["/dashboard/earnings", "Earnings"],
  ["/dashboard/payouts", "Payouts"],
  ["/dashboard/analytics", "Analytics"],
  ["/dashboard/labs", "Labs"],
  ["/dashboard/review", "Review queue"],
  ["/dashboard/admin", "Admin"],
  ["/dashboard/settings", "Settings"],
] as const;

export function DashboardSidebar({ summary }: { summary: StudioSummary }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = sectionLabels.find(([path]) => pathname.startsWith(path))?.[1] ?? "Overview";

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <>
      <aside className="sticky top-20 hidden max-h-[calc(100svh-6rem)] flex-col gap-6 overflow-y-auto pb-4 lg:flex">
        <SidebarContent summary={summary} />
      </aside>

      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="dashboard-mobile-navigation"
          onClick={() => setMobileOpen((open) => !open)}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 text-left text-sm transition-[background-color,border-color] [transition-duration:var(--motion-control-duration)] [transition-timing-function:var(--ease-out-exact)] hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <LayoutDashboard aria-hidden className="size-4 text-muted-foreground" />
          <span className="font-medium">Dashboard</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{current}</span>
          <ChevronDown
            aria-hidden
            className={`size-4 text-muted-foreground transition-transform [transition-duration:var(--motion-control-duration)] ${mobileOpen ? "rotate-180" : ""}`}
          />
        </button>
        {mobileOpen ? (
          <div
            id="dashboard-mobile-navigation"
            className="mt-2 max-h-[65svh] overflow-y-auto rounded-xl border border-border/60 bg-card p-3"
          >
            <SidebarContent summary={summary} mobile />
          </div>
        ) : null}
      </div>
    </>
  );
}

function SidebarContent({ summary, mobile = false }: { summary: StudioSummary; mobile?: boolean }) {
  const itemClass = `flex items-center gap-2.5 rounded-md px-2 text-sm text-foreground transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&.active]:bg-accent ${mobile ? "min-h-11 py-2" : "py-1.5"}`;
  return (
    <div className="flex flex-col gap-6">
      <Button asChild className={mobile ? "h-11 w-full" : "w-full"}>
        <Link to="/dashboard/new"><Plus /> New component</Link>
      </Button>

      <SidebarSection label="Library">
        <Link to="/dashboard" activeOptions={{ exact: true }} className={itemClass}><BarChart3 className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Overview</span></Link>
        <Link to="/dashboard/components" className={itemClass}><Blocks className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Components</span><span className="text-xs tabular-nums text-muted-foreground">{summary.counts.components}</span></Link>
        <Link to="/dashboard/lists" className={itemClass}><Bookmark className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Lists</span><SidebarBadge>Plus</SidebarBadge></Link>
        {DIRECT_MARKETPLACE_ENABLED ? <Link to="/dashboard/purchases" className={itemClass}><ShoppingBag className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Purchases</span></Link> : null}
        <Link to="/dashboard/collections" className={itemClass}><Library className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Collections</span></Link>
      </SidebarSection>

      <SidebarSection label="Creator">
        <Link to="/dashboard/earnings" className={itemClass}><Sparkles className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Earnings</span></Link>
        <Link to="/dashboard/payouts" className={itemClass}><Banknote className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Payouts</span></Link>
        <Link to="/dashboard/analytics" className={itemClass}><BarChart3 className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Analytics</span></Link>
        {summary.namespace ? (
          <Link to="/$username" params={{ username: summary.namespace }} className={itemClass}><UserRound className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Public profile</span></Link>
        ) : <SidebarRow icon={UserRound} label="Public profile" mobile={mobile} />}
      </SidebarSection>

      <SidebarSection label="Tools">
        <SidebarRow icon={KeyRound} label="API key" badge="Soon" mobile={mobile} />
        <SidebarRow icon={TerminalSquare} label="Modulora CLI" badge="Soon" mobile={mobile} />
        <Link to="/dashboard/labs" className={itemClass}><FlaskConical className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Labs</span></Link>
      </SidebarSection>

      {summary.roles.curator ? <SidebarSection label="Curation"><Link to="/dashboard/review" className={itemClass}><ClipboardCheck className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Review queue</span></Link></SidebarSection> : null}
      {summary.roles.owner ? <SidebarSection label="Platform"><Link to="/dashboard/admin" className={itemClass}><ShieldEllipsis className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Admin</span></Link></SidebarSection> : null}
      <SidebarSection label="Account"><Link to="/dashboard/settings" className={itemClass}><Settings className="size-4 shrink-0 opacity-70" /><span className="flex-1 truncate">Settings</span></Link></SidebarSection>
    </div>
  );
}

function SidebarSection({ label, children }: { label: string; children: ReactNode }) {
  return <nav aria-label={label} className="flex flex-col gap-1"><span className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">{label}</span>{children}</nav>;
}

function SidebarBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">{children}</span>;
}

function SidebarRow({ icon: Icon, label, badge, mobile }: { icon: typeof Blocks; label: string; badge?: string; mobile?: boolean }) {
  return (
    <div aria-disabled="true" className={`flex items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground/70 ${mobile ? "min-h-11 py-2" : "py-1.5"}`}>
      <Icon className="size-4 shrink-0 opacity-70" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? <SidebarBadge>{badge}</SidebarBadge> : null}
    </div>
  );
}
