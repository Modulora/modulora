import { createFileRoute, redirect } from "@tanstack/react-router";
import { ComponentEditor } from "@/components/component-editor";

export const Route = createFileRoute("/dashboard/new")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  component: NewComponent,
});

function NewComponent() {
  const { user } = Route.useRouteContext();
  return <ComponentEditor username={user?.username ?? null} mode="create" />;
}
