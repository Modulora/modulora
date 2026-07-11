import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({ component: DashboardStub });

function DashboardStub() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">Your studio is coming together.</p>
    </div>
  );
}
