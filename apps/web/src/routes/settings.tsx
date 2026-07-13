/** Legacy URL: settings now lives inside the dashboard shell. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/settings" });
  },
});
