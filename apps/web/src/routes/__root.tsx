import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  redirect,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { AppShell } from "@/components/app-shell";
import { fetchSessionContext } from "@/lib/session";
import appCss from "../styles.css?url";

/* Routes that render as full-screen canvases without the app shell chrome. */
const CHROME_FREE = new Set(["/", "/signin"]);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Modulora — Discover your next great component." },
      {
        name: "description",
        content:
          "Browse open and premium components from trusted creators. Install with one command—or let your coding agent handle it.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  beforeLoad: async ({ location }) => {
    const { user, gated } = await fetchSessionContext();
    // Alpha: the whole product requires a signed-in (allowlisted) account.
    // Only the landing page, sign-in, and legal pages stay public.
    const PUBLIC = ["/", "/signin", "/privacy", "/terms", "/publishing-policy", "/pricing"];
    const isPublic = PUBLIC.some((path) =>
      path === "/" ? location.pathname === "/" : location.pathname === path || location.pathname.startsWith(`${path}/`),
    );
    if (gated && !user && !isPublic) {
      throw redirect({ to: "/signin" });
    }
    return { user, gated };
  },
  component: RootComponent,
});

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = Route.useRouteContext();

  if (CHROME_FREE.has(pathname) || pathname.startsWith("/preview/")) {
    return (
      <RootDocument>
        <NuqsAdapter>
          <Outlet />
        </NuqsAdapter>
      </RootDocument>
    );
  }

  return (
    <RootDocument>
      <NuqsAdapter>
        <AppShell user={user}>
          <Outlet />
        </AppShell>
      </NuqsAdapter>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
