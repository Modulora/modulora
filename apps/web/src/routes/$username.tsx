import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$username")({
  component: ProfileStub,
});

function ProfileStub() {
  const { username } = Route.useParams();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold tracking-tight">@{username}</h1>
      <p className="text-muted-foreground">Public profile is coming soon.</p>
    </div>
  );
}
