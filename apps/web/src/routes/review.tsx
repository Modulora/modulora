/** Legacy URL: review now lives inside the dashboard shell. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/review")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/review" });
  },
});
