/**
 * The persistent dashboard sidebar — rendered by the /dashboard layout route
 * so it stays put while users navigate between dashboard pages.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  BarChart3,
  Blocks,
  KeyRound,
  Library,
  Plus,
  Sparkles,
  TerminalSquare,
  UserRound,
  ShoppingBag,
} from "lucide-react";
import type { StudioSummary } from "@/lib/studio";

const SIDEBAR = {
  offsetX: -10,
  spring: { type: "spring" as const, stiffness: 320, damping: 30 },
};

const itemClass =
  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent/60 [&.active]:bg-accent";

export function DashboardSidebar({ summary }: { summary: StudioSummary }) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: SIDEBAR.offsetX }}
      animate={{ opacity: 1, x: 0 }}
      transition={SIDEBAR.spring}
      className="flex flex-col gap-6"
    >
      <NewButton />

      <nav className="flex flex-col gap-1">
        <SidebarHeading>Library</SidebarHeading>
        <Link to="/dashboard" activeOptions={{ exact: true }} className={itemClass}>
          <BarChart3 className="size-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">Overview</span>
        </Link>
        <Link to="/dashboard/components" className={itemClass}>
          <Blocks className="size-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">Components</span>
          <span className="text-xs tabular-nums text-muted-foreground">{summary.counts.components}</span>
        </Link>
        <Link to="/dashboard/purchases" className={itemClass}>
          <ShoppingBag className="size-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">Purchases</span>
        </Link>
        <SidebarRow icon={Library} label="Libraries" count={summary.counts.libraries} muted />
      </nav>

      <nav className="flex flex-col gap-1">
        <SidebarHeading>Creator</SidebarHeading>
        <Link to="/dashboard/earnings" className={itemClass}>
          <Sparkles className="size-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">Earnings</span>
        </Link>
        <SidebarRow icon={BarChart3} label="Analytics" muted />
        {summary.namespace ? (
          <Link to="/$username" params={{ username: summary.namespace }} className={itemClass}>
            <UserRound className="size-4 shrink-0 opacity-70" />
            <span className="flex-1 truncate">Public profile</span>
          </Link>
        ) : (
          <SidebarRow icon={UserRound} label="Public profile" muted />
        )}
      </nav>

      <nav className="flex flex-col gap-1">
        <SidebarHeading>Tools</SidebarHeading>
        <SidebarRow icon={KeyRound} label="API key" muted />
        <SidebarRow icon={TerminalSquare} label="Modulora CLI" muted />
      </nav>
    </motion.aside>
  );
}

function NewButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/dashboard/new" })}
      className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <Plus className="size-4" />
      New component
    </button>
  );
}

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
      {children}
    </span>
  );
}

function SidebarRow({
  icon: Icon,
  label,
  count,
  badge,
  muted,
}: {
  icon: typeof Blocks;
  label: string;
  count?: number;
  badge?: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${muted ? "text-muted-foreground/70" : "text-foreground"}`}>
      <Icon className="size-4 shrink-0 opacity-70" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{badge}</span>
      ) : null}
      {typeof count === "number" ? <span className="text-xs tabular-nums text-muted-foreground">{count}</span> : null}
    </div>
  );
}
