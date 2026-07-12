import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/new")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  component: NewComponentStub,
});

function NewComponentStub() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold tracking-tight">New component</h1>
      <p className="text-muted-foreground">
        The studio editor is coming next. This is where you'll author and
        publish a component.
      </p>
    </div>
  );
}
