import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { fetchCurrentUser } from "@/lib/session";
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
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    return { user };
  },
  component: RootComponent,
});

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = Route.useRouteContext();

  if (CHROME_FREE.has(pathname)) {
    return (
      <RootDocument>
        <Outlet />
      </RootDocument>
    );
  }

  return (
    <RootDocument>
      <AppShell user={user}>
        <Outlet />
      </AppShell>
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
