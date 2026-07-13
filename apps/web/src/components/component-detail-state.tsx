import type { ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ComponentDetailLoading() {
  return (
    <div role="status" aria-label="Loading component" className="flex flex-col gap-6">
      <span className="sr-only">Loading component…</span>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-48 animate-pulse rounded bg-secondary/50" />
        <div className="h-8 w-64 max-w-full animate-pulse rounded-md bg-secondary/70" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="h-[36rem] animate-pulse rounded-xl bg-secondary/45" />
        <div className="flex flex-col gap-3">
          <div className="h-24 animate-pulse rounded-xl bg-secondary/45" />
          <div className="h-64 animate-pulse rounded-xl bg-secondary/45" />
        </div>
      </div>
    </div>
  );
}

export function ComponentDetailError({ error, reset }: ErrorComponentProps) {
  return (
    <div role="alert" className="flex min-h-[28rem] flex-col items-center justify-center gap-3 rounded-xl border border-border/60 px-6 text-center">
      <AlertTriangle aria-hidden className="size-6 text-destructive" />
      <div>
        <h1 className="text-lg font-semibold">Component couldn&apos;t load</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error && error.message ? error.message : "Something interrupted this request."}
        </p>
      </div>
      <Button type="button" variant="outline" onClick={reset}>Try again</Button>
    </div>
  );
}
