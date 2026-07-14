import { useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HiArrowPath as Loader2, HiLockClosed as LockKeyhole, HiTicket as TicketCheck } from "react-icons/hi2";
import { GitHubIcon as Github } from "@/components/brand-icons";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { inspectAlphaInvitation } from "@/lib/invitations";

export const Route = createFileRoute("/invite/$token")({
  validateSearch: (search: Record<string, unknown>) => ({
    providerError: typeof search.providerError === "string" ? search.providerError : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  loader: ({ params }) => inspectAlphaInvitation({ data: { token: params.token } }),
  component: InvitationSetupPage,
});

async function prepareInvitation(token: string): Promise<string | null> {
  const response = await fetch("/api/invitations/prepare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const result = (await response.json()) as { ok?: boolean; error?: string };
  return result.ok ? null : result.error ?? "This setup link is no longer active.";
}

async function clearPreparedInvitation(): Promise<void> {
  await fetch("/api/invitations/prepare", { method: "DELETE" });
}

function InvitationSetupPage() {
  const invitation = Route.useLoaderData();
  const { token } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"github" | "password" | null>(null);
  const [error, setError] = useState<string | null>(
    search.providerError || search.error
      ? "GitHub account setup did not complete. Your invitation is still active; try again or use credentials."
      : null,
  );
  const [resetSent, setResetSent] = useState(false);

  if (invitation.state !== "pending" || !invitation.email || !invitation.username) {
    const copy = invitation.state === "accepted"
      ? "This invitation has already been used. Sign in with the account you completed."
      : invitation.state === "expired"
        ? "This invitation expired. Ask the Modulora owner to resend it."
        : invitation.state === "revoked"
          ? "This invitation was revoked."
          : "This invitation is invalid.";
    return <SetupShell title="Setup link unavailable" description={copy}><Button asChild><Link to="/signin">Go to sign in</Link></Button></SetupShell>;
  }

  async function withPreparedInvitation(action: () => Promise<void>) {
    setError(null);
    const prepareError = await prepareInvitation(token);
    if (prepareError) {
      setError(prepareError);
      setBusy(null);
      return;
    }
    await action();
  }

  async function finishWithGitHub() {
    setBusy("github");
    await withPreparedInvitation(async () => {
      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/dashboard",
        errorCallbackURL: `/invite/${encodeURIComponent(token)}?providerError=github`,
      });
      if (result.error) {
        setError(result.error.message ?? "GitHub setup could not start.");
        setBusy(null);
      }
    });
  }

  async function finishWithPassword(event: FormEvent) {
    event.preventDefault();
    setBusy("password");
    await withPreparedInvitation(async () => {
      if (invitation.accountExists) {
        const redirectTo = `${window.location.origin}/reset-password?invite=${encodeURIComponent(token)}`;
        const result = await authClient.requestPasswordReset({ email: invitation.email!, redirectTo });
        setBusy(null);
        if (result.error) {
          setError(result.error.message ?? "Password setup email could not be sent.");
          return;
        }
        setResetSent(true);
        return;
      }
      const result = await authClient.signUp.email({
        name: name.trim() || invitation.username!,
        email: invitation.email!,
        password,
        callbackURL: "/dashboard",
      });
      setBusy(null);
      if (result.error) {
        setError(result.error.message ?? "Account setup failed.");
        return;
      }
      await clearPreparedInvitation();
      await navigate({ to: "/dashboard" });
    });
  }

  return (
    <SetupShell
      title={`Claim @${invitation.username}`}
      description={`Invitation for ${invitation.email}. Finish with GitHub or establish credentials; both paths attach to this reserved namespace.`}
    >
      <Button className="min-h-11 w-full" disabled={busy !== null} onClick={finishWithGitHub}>
        {busy === "github" ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />}
        Finish with GitHub
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>or use credentials</span><span className="h-px flex-1 bg-border" /></div>
      {resetSent ? (
        <div className="rounded-lg border border-receipt/30 bg-receipt/10 p-4 text-sm">
          Check {invitation.email} for the password setup link.
        </div>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={finishWithPassword}>
          {!invitation.accountExists ? (
            <label className="flex flex-col gap-1.5"><Label htmlFor="invite-name">Name</Label><Input id="invite-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>
          ) : null}
          {!invitation.accountExists ? (
            <label className="flex flex-col gap-1.5"><Label htmlFor="invite-password">Password</Label><Input id="invite-password" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          ) : null}
          <Button type="submit" variant="secondary" className="min-h-11" disabled={busy !== null}>
            {busy === "password" ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
            {invitation.accountExists ? "Email password setup link" : "Create account with password"}
          </Button>
        </form>
      )}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <p className="text-xs leading-relaxed text-muted-foreground">The setup link is single-use and expires {invitation.expiresAt?.slice(0, 10)}. Modulora never asks you to send a password or provider token to an administrator.</p>
    </SetupShell>
  );
}

function SetupShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="mb-6 flex items-center justify-between"><Logo className="h-7 w-auto" /><TicketCheck className="size-5 text-ticket" aria-hidden /></div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-col gap-4">{children}</div>
      </div>
    </main>
  );
}
