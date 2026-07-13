/**
 * Device authorization approval page (RFC 8628) — where `modulora login`
 * sends the user. Shows the code the CLI displayed; the signed-in user
 * confirms it matches and approves (or denies). Kept deliberately plain and
 * explicit: this grants the CLI access to the user's account.
 */
import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/device")({
  validateSearch: (search: Record<string, unknown>) => ({
    user_code: typeof search.user_code === "string" ? search.user_code : "",
  }),
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  component: DevicePage,
});

function DevicePage() {
  const { user_code } = Route.useSearch();
  const [code, setCode] = useState(user_code);
  const [state, setState] = useState<"idle" | "busy" | "approved" | "denied">("idle");
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "approve" | "deny") {
    setState("busy");
    setError(null);
    const userCode = code.trim();
    // The device flow requires the signed-in session to claim the code first.
    const claim = await authClient.$fetch(`/device?user_code=${encodeURIComponent(userCode)}`, { method: "GET" });
    if (claim.error) {
      setError(claim.error.message ?? "That code was not recognized. Check it and try again.");
      setState("idle");
      return;
    }
    const res = await authClient.$fetch(`/device/${action}`, {
      method: "POST",
      body: { userCode },
    });
    if (res.error) {
      setError(res.error.message ?? "That code was not recognized. Check it and try again.");
      setState("idle");
      return;
    }
    setState(action === "approve" ? "approved" : "denied");
  }

  if (state === "approved" || state === "denied") {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 px-4 py-24 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-card/40">
          <TerminalSquare className="size-5" />
        </span>
        <h1 className="text-lg font-semibold">
          {state === "approved" ? "Device connected" : "Request denied"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {state === "approved"
            ? "You can close this tab and return to your terminal."
            : "The CLI was not granted access. You can close this tab."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-24">
      <div className="flex flex-col gap-5 rounded-xl border border-border/60 bg-card/35 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-card/40">
            <TerminalSquare className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Connect the Modulora CLI</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A terminal is asking to sign in as you. Only continue if the code below matches the one shown in your terminal.
            </p>
          </div>
        </div>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX"
          autoFocus={!user_code}
          className="h-12 text-center font-mono text-xl tracking-[0.3em]"
        />
        {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button className="flex-1" disabled={state === "busy" || !code.trim()} onClick={() => decide("approve")}>
            {state === "busy" ? <Loader2 className="size-4 animate-spin" /> : null} Approve
          </Button>
          <Button variant="outline" disabled={state === "busy" || !code.trim()} onClick={() => decide("deny")}>
            Deny
          </Button>
        </div>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Approving gives the CLI access to your account: installing your purchased components and publishing under your namespace. You can revoke access any time by signing out sessions in settings.
        </p>
      </div>
    </div>
  );
}
