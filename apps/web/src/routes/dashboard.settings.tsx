/** Settings layout: sub-pages render in the dashboard shell. */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings")({
  component: () => <Outlet />,
});
