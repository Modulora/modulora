import type { ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-6">
      <span className="sr-only">Loading dashboard…</span>
      <div className="h-11 animate-pulse rounded-lg bg-secondary/60 lg:hidden" />
      <div className="flex flex-col gap-2">
        <div className="h-7 w-36 animate-pulse rounded-md bg-secondary/70" />
        <div className="h-4 w-full max-w-sm animate-pulse rounded bg-secondary/50" />
      </div>
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
        <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
      </div>
    </div>
  );
}

export function DashboardRouteError({ error, reset }: ErrorComponentProps) {
  return (
    <div role="alert" className="flex min-h-64 max-w-2xl flex-col items-center justify-center gap-3 rounded-xl border border-border/60 px-6 text-center">
      <AlertTriangle aria-hidden className="size-6 text-destructive" />
      <div>
        <h1 className="text-lg font-semibold">Dashboard couldn&apos;t load</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error && error.message ? error.message : "Something interrupted this request."}
        </p>
      </div>
      <Button type="button" variant="outline" onClick={reset}>Try again</Button>
    </div>
  );
}
