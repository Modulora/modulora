import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
    invite: typeof search.invite === "string" ? search.invite : undefined,
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, invite } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  async function reset(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (invite) {
      const prepared = await fetch("/api/invitations/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: invite }),
      });
      if (!prepared.ok) {
        const body = (await prepared.json()) as { error?: string };
        setBusy(false);
        setError(body.error ?? "The alpha invitation is no longer active.");
        return;
      }
    }
    const result = await authClient.resetPassword({ token, newPassword: password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Password reset failed.");
      return;
    }
    await fetch("/api/invitations/prepare", { method: "DELETE" });
    setComplete(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/70 p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between"><Logo className="h-7 w-auto" /><KeyRound className="size-5 text-ticket" aria-hidden /></div>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">The reset token is single-use. Completing it signs out other active sessions.</p>
        {complete ? (
          <div className="mt-6 flex flex-col gap-4"><p role="status" className="text-sm text-receipt">Password updated. Your alpha account is ready.</p><Button asChild><Link to="/signin">Continue to sign in</Link></Button></div>
        ) : token ? (
          <form className="mt-6 flex flex-col gap-4" onSubmit={reset}>
            <label className="flex flex-col gap-1.5"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <Button type="submit" className="min-h-11" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : null}Update password</Button>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </form>
        ) : <p role="alert" className="mt-6 text-sm text-destructive">This reset link is invalid.</p>}
      </div>
    </main>
  );
}
