/* ─────────────────────────────────────────────────────────
 * DASHBOARD (My Studio) — entrance storyboard
 *
 * Read top-to-bottom. Each `at` value is ms after mount.
 *
 *    0ms   layout hidden
 *   60ms   studio sidebar fades/slides in from the left
 *  160ms   overview heading fades in
 *  240ms   stat cards rise, staggered 60ms each
 *  460ms   action panels fade in
 * ───────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  Blocks,
  KeyRound,
  Library,
  Plus,
  Sparkles,
  TerminalSquare,
  UserRound,
} from "lucide-react";

import { fetchStudioSummary, type StudioSummary } from "@/lib/studio";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  loader: async () => {
    const summary = await fetchStudioSummary();
    if (!summary) throw redirect({ to: "/signin" });
    return summary;
  },
  component: Dashboard,
});

const TIMING = {
  sidebar: 60, // studio sidebar slides in
  heading: 160, // overview heading
  stats: 240, // stat cards begin
  panels: 460, // action panels
};

const SIDEBAR = {
  offsetX: -10, // px slide from
  spring: { type: "spring" as const, stiffness: 320, damping: 30 },
};

const RISE = {
  offsetY: 8, // px rise from
  stagger: 0.06, // seconds between stat cards
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
  const summary = Route.useLoaderData();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
    const timers = [
      setTimeout(() => setStage(1), TIMING.sidebar),
      setTimeout(() => setStage(2), TIMING.heading),
      setTimeout(() => setStage(3), TIMING.stats),
      setTimeout(() => setStage(4), TIMING.panels),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <motion.aside
        initial={{ opacity: 0, x: SIDEBAR.offsetX }}
        animate={{ opacity: stage >= 1 ? 1 : 0, x: stage >= 1 ? 0 : SIDEBAR.offsetX }}
        transition={SIDEBAR.spring}
        className="flex flex-col gap-6"
      >
        <NewButton />

        <nav className="flex flex-col gap-1">
          <SidebarHeading>Content</SidebarHeading>
          {CONTENT_TYPES.map((type) => (
            <SidebarRow
              key={type.label}
              icon={type.icon}
              label={type.label}
              count={summary.counts[type.key]}
            />
          ))}
        </nav>

        <nav className="flex flex-col gap-1">
          <SidebarHeading>For public creators</SidebarHeading>
          <SidebarRow icon={BarChart3} label="Analytics" muted />
          <SidebarRow icon={Sparkles} label="Demand" badge="Soon" muted />
          {summary.namespace ? (
            <SidebarLink
              icon={UserRound}
              label="Public profile"
              to="/$username"
              params={{ username: `@${summary.namespace}` }}
            />
          ) : (
            <SidebarRow icon={UserRound} label="Public profile" muted />
          )}
        </nav>

        <nav className="flex flex-col gap-1">
          <SidebarHeading>Developer</SidebarHeading>
          <SidebarRow icon={KeyRound} label="API key" muted />
          <SidebarRow icon={TerminalSquare} label="CLI" muted />
        </nav>
      </motion.aside>

      <div className="flex flex-col gap-8">
        <motion.div
          initial={{ opacity: 0, y: RISE.offsetY }}
          animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : RISE.offsetY }}
          transition={RISE.spring}
        >
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back
            {summary.namespace ? (
              <>
                , <span className="text-foreground">@{summary.namespace}</span>
              </>
            ) : null}
            . Here's your studio at a glance.
          </p>
        </motion.div>

        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          {CONTENT_TYPES.map((type, i) => (
            <motion.div
              key={type.label}
              initial={{ opacity: 0, y: RISE.offsetY }}
              animate={{
                opacity: stage >= 3 ? 1 : 0,
                y: stage >= 3 ? 0 : RISE.offsetY,
              }}
              transition={{ ...RISE.spring, delay: i * RISE.stagger }}
            >
              <StatCard
                icon={type.icon}
                label={type.label}
                value={summary.counts[type.key]}
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 4 ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="grid gap-4 lg:grid-cols-2"
        >
          <Panel title="Start something">
            <ActionRow
              icon={Blocks}
              title="New component"
              description="Author a React component in the studio editor."
              to="/dashboard/new"
            />
          </Panel>

          <Panel title="Grow your reach">
            <ActionRow
              icon={BarChart3}
              title="Analytics"
              description="See views and installs once you publish."
              disabled
            />
            <ActionRow
              icon={UserRound}
              title="Public profile"
              description={
                summary.namespace
                  ? `Your components live at @${summary.namespace}.`
                  : "Claim a namespace to get a public profile."
              }
              to={summary.namespace ? "/$username" : undefined}
              params={
                summary.namespace
                  ? { username: `@${summary.namespace}` }
                  : undefined
              }
            />
          </Panel>
        </motion.div>
      </div>
    </div>
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
    <div
      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${
        muted ? "text-muted-foreground/70" : "text-foreground"
      }`}
    >
      <Icon className="size-4 shrink-0 opacity-70" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {badge}
        </span>
      ) : null}
      {typeof count === "number" ? (
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      ) : null}
    </div>
  );
}

function SidebarLink({
  icon: Icon,
  label,
  to,
  params,
}: {
  icon: typeof Blocks;
  label: string;
  to: "/$username";
  params: { username: string };
}) {
  return (
    <Link
      to={to}
      params={params}
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent/60"
    >
      <Icon className="size-4 shrink-0 opacity-70" />
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Blocks;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground/60" />
      </div>
      <span className="text-3xl font-bold tabular-nums tracking-tight">
        {value}
      </span>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
  to?: "/dashboard/new" | "/$username";
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
    return (
      <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 opacity-70">
        {inner}
      </div>
    );
  }

  return (
    <Link
      to={to}
      params={params as never}
      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60"
    >
      {inner}
    </Link>
  );
}
