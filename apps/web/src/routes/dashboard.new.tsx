import { createFileRoute, redirect } from "@tanstack/react-router";
import { ComponentEditor } from "@/components/component-editor";
import { usePageTheme } from "@/lib/use-page-theme";
import { resolvePierreCodeTheme } from "@/lib/pierre-theme";

export const Route = createFileRoute("/dashboard/new")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  component: NewComponent,
});

function NewComponent() {
  const { user } = Route.useRouteContext();
  const pageTheme = usePageTheme();
  return <ComponentEditor username={user?.username ?? null} mode="create" editorTheme={resolvePierreCodeTheme(pageTheme, user?.colorVisionMode ?? "standard")} />;
}
