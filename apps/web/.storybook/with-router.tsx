import type { ReactNode } from "react";
import { RouterProvider, createRouter, createRootRoute, createMemoryHistory } from "@tanstack/react-router";

/**
 * Story decorator that mounts children under a minimal TanStack Router so
 * components using <Link> render without a real app router.
 */
export function withRouter(Story: () => ReactNode) {
  const rootRoute = createRootRoute({ component: () => <>{Story()}</> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <RouterProvider router={router as any} />;
}
