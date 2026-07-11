import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/$username")({
  beforeLoad: ({ params }) => {
    // Profiles live at /@handle; anything without the leading @ is not a profile.
    if (!params.username.startsWith("@")) throw notFound();
  },
  component: ProfileStub,
});

function ProfileStub() {
  const { username } = Route.useParams();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold tracking-tight">{username}</h1>
      <p className="text-muted-foreground">Public profile is coming soon.</p>
    </div>
  );
}
