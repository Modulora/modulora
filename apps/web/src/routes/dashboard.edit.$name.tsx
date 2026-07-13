import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { ComponentEditor } from "@/components/component-editor";
import { fetchComponentForEdit } from "@/lib/catalog-db";

export const Route = createFileRoute("/dashboard/edit/$name")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  loader: async ({ params }) => {
    const component = await fetchComponentForEdit({ data: { name: params.name } });
    if (!component) throw notFound();
    return component;
  },
  component: EditComponent,
});

function EditComponent() {
  const initial = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  return (
    <ComponentEditor username={user?.username ?? null} mode="edit" initial={initial} editorTheme={user?.editorTheme} />
  );
}
