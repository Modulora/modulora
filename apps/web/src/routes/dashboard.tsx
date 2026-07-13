/**
 * Dashboard layout: the sidebar persists while users navigate between
 * dashboard pages. The editor routes (/dashboard/new, /dashboard/edit) stay
 * full-bleed — they own the whole viewport.
 */
import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardLoading, DashboardRouteError } from "@/components/dashboard-route-state";
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
  pendingComponent: DashboardLoading,
  errorComponent: DashboardRouteError,
  component: DashboardLayout,
});

function DashboardLayout() {
  const summary = Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fullBleed = pathname.startsWith("/dashboard/new") || pathname.startsWith("/dashboard/edit");

  if (fullBleed) return <Outlet />;

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8">
      <DashboardSidebar summary={summary} />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
