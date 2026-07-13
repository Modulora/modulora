/** Account security: password + sessions. */
import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getConnections, notifyPasswordChanged } from "@/lib/profile";
import { changePassword, signOut } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/settings/security")({
  loader: async () => ({ connections: await getConnections() }),
  component: SecurityPage,
});

function SecurityPage() {
  const { connections } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();

  async function onSignOut() {
    await signOut();
    await router.invalidate();
    navigate({ to: "/" });
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <DashboardPageHeader title="Security" description="Password and active sessions." />

      {connections.hasPassword ? (
        <PasswordSection />
      ) : (
        <p className="rounded-xl border border-border/60 p-4 text-xs text-muted-foreground">
          You sign in with a connected account, so there is no password to manage.
        </p>
      )}

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-6">
        <div>
          <p className="text-sm font-medium">Sign out</p>
          <p className="mt-1 text-xs text-muted-foreground">End this session on this device.</p>
        </div>
        <Button type="button" variant="outline" onClick={onSignOut}>Sign out</Button>
      </div>
    </div>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Could not change password.");
      return;
    }
    setCurrent("");
    setNext("");
    setDone(true);
    // Security notification (server-side; failure is non-blocking).
    void notifyPasswordChanged();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/40 p-6">
      <div>
        <h2 className="text-sm font-semibold">Password</h2>
        <p className="mt-1 text-xs text-muted-foreground">Changing your password signs out other sessions.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => { setCurrent(e.target.value); setDone(false); setError(null); }} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => { setNext(e.target.value); setDone(false); setError(null); }} required />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
        {done ? <span className="flex items-center gap-1 text-xs text-receipt"><Check className="size-3.5" /> Updated</span> : null}
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Update password</Button>
      </div>
    </form>
  );
}
