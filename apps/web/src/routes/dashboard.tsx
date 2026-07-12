/**
 * Dashboard layout: the sidebar persists while users navigate between
 * dashboard pages. The editor routes (/dashboard/new, /dashboard/edit) stay
 * full-bleed — they own the whole viewport.
 */
import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { fetchStudioSummary } from "@/lib/studio";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  loader: async () => {
    const summary = await fetchStudioSummary();
    if (!summary) throw redirect({ to: "/signin" });
    return summary;
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const summary = Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fullBleed = pathname.startsWith("/dashboard/new") || pathname.startsWith("/dashboard/edit");

  if (fullBleed) return <Outlet />;

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <DashboardSidebar summary={summary} />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
