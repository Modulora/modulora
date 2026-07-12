/** Legacy URL: the earnings explainer now lives in the docs. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/profit-share")({
  beforeLoad: () => {
    throw redirect({ to: "/docs/$", params: { _splat: "earning" } });
  },
});
