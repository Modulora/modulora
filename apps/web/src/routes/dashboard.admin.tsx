/**
 * Owner-only platform operations. Unlisted — no links point here — and
 * gated by OWNER_USER_IDS: anyone else gets a 404, so the surface doesn't
 * exist publicly. Curators do not have access; reviewing content and moving
 * money are different powers.
 */
import { useState } from "react";
import { runWeeklyDigestNow } from "@/lib/weekly-digest";
import { createFileRoute, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { HiShieldExclamation as ShieldEllipsis } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/session";
import { isOwnerUser } from "@/lib/access";
import { createPayoutRun, listPayoutRuns, type PayoutRunSummary } from "@/lib/distribution";
import { listMembers, setCuratorRole, type Member } from "@/lib/roles";
import {
  inviteAlphaUser,
  listAlphaWaitlistCandidates,
  resendAlphaInvitation,
  revokeAlphaInvitation,
  type AlphaWaitlistPage,
} from "@/lib/invitations";

const fetchAdmin = createServerFn({ method: "GET" })
  .validator((data: { invitationPage: number }) => ({ invitationPage: Math.max(0, Math.floor(Number(data.invitationPage) || 0)) }))
  .handler(async ({ data }) => {
  const request = getRequest();
  const user = request ? await getCurrentUser(request) : null;
  if (!user || !isOwnerUser(user.id)) return null;
  return {
    runs: await listPayoutRuns(),
    members: await listMembers(),
    invitations: await listAlphaWaitlistCandidates({ data: { page: data.invitationPage, pageSize: 10 } }),
  };
});

export const Route = createFileRoute("/dashboard/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    invitationPage: Math.max(0, Math.floor(Number(search.invitationPage) || 0)),
  }),
  loaderDeps: ({ search }) => ({ invitationPage: search.invitationPage }),
  loader: async ({ deps }) => {
    const data = await fetchAdmin({ data: deps });
    if (!data) throw notFound();
    return data;
  },
  component: AdminPage,
});

function AdminPage() {
  const { runs, members, invitations } = Route.useLoaderData();
  return (
    <div className="w-full max-w-3xl">
      <DashboardPageHeader
        title="Platform operations"
        icon={ShieldEllipsis}
        description="Owner-only controls. Nothing on this page is linked publicly."
      />

      <InvitationsSection invitations={invitations} />
      <DistributionsSection runs={runs} />
      <RolesSection members={members} />
    </div>
  );
}

function InvitationsSection({ invitations }: { invitations: AlphaWaitlistPage }) {
  const router = useRouter();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pageCount = Math.max(1, Math.ceil(invitations.total / invitations.pageSize));

  async function invite(waitlistEntryId: string) {
    setBusyId(waitlistEntryId);
    setMessage(null);
    const result = await inviteAlphaUser({ data: { waitlistEntryId } });
    setBusyId(null);
    if (!result.ok) {
      setMessage(result.error ?? "Invitation failed.");
      return;
    }
    setMessage("Invitation sent.");
    await router.invalidate();
  }

  async function resend(invitationId: string) {
    setBusyId(invitationId);
    const result = await resendAlphaInvitation({ data: { invitationId } });
    setBusyId(null);
    setMessage(result.ok ? "Invitation resent with a new setup link." : result.error ?? "Resend failed.");
    if (result.ok) await router.invalidate();
  }

  async function revoke(invitationId: string) {
    if (!window.confirm("Revoke this invitation and its alpha access?")) return;
    setBusyId(invitationId);
    const result = await revokeAlphaInvitation({ data: { invitationId } });
    setBusyId(null);
    setMessage(result.ok ? "Invitation revoked." : result.error ?? "Revoke failed.");
    if (result.ok) await router.invalidate();
  }

  return (
    <section className="mt-10" aria-labelledby="alpha-invitations-heading">
      <h2 id="alpha-invitations-heading" className="text-sm font-semibold">Alpha invitations</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Invite people from the waitlist into the alpha. Setup links are single-use, expire after seven days, and claim the username they already reserved.
      </p>
      {message ? <p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
      <div className="mt-4 overflow-hidden rounded-xl border border-border/35 bg-card/20">
        <Table>
          <TableHeader>
            <TableRow className="border-border/35 bg-muted/15 hover:bg-muted/15">
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Alpha access</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No one has joined the waitlist yet.</TableCell></TableRow>
            ) : invitations.items.map((candidate) => (
              <TableRow key={candidate.waitlistEntryId} className="border-border/25 hover:bg-muted/15">
                <TableCell className="font-medium">@{candidate.username}</TableCell>
                <TableCell>{candidate.email}</TableCell>
                <TableCell className="text-muted-foreground">{candidate.joinedAt.slice(0, 10)}</TableCell>
                <TableCell className="capitalize">
                  {candidate.invitation
                    ? `${candidate.invitation.state} · ${candidate.invitation.sendCount} send${candidate.invitation.sendCount === 1 ? "" : "s"}`
                    : candidate.claimedByUserId ? "Account exists" : "Not invited"}
                </TableCell>
                <TableCell>
                  <div className="flex min-w-max justify-end gap-2">
                    {!candidate.invitation || candidate.invitation.state === "revoked" || candidate.invitation.state === "expired" ? (
                      <Button size="sm" variant="outline" disabled={busyId === candidate.waitlistEntryId} onClick={() => invite(candidate.waitlistEntryId)}>Invite</Button>
                    ) : null}
                    {candidate.invitation?.state === "pending" ? (
                      <Button size="sm" variant="outline" disabled={busyId === candidate.invitation.id} onClick={() => resend(candidate.invitation!.id)}>Resend</Button>
                    ) : null}
                    {candidate.invitation && candidate.invitation.state !== "revoked" ? (
                      <Button size="sm" variant="ghost" disabled={busyId === candidate.invitation.id} onClick={() => revoke(candidate.invitation!.id)}>Revoke</Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {invitations.total > invitations.pageSize ? (
          <div className="flex items-center justify-between border-t border-border/25 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {invitations.page * invitations.pageSize + 1}–{Math.min((invitations.page + 1) * invitations.pageSize, invitations.total)} of {invitations.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={invitations.page === 0}
                onClick={() => navigate({ to: "/dashboard/admin", search: { invitationPage: Math.max(0, invitations.page - 1) } })}
              >Previous</Button>
              <span className="min-w-16 text-center text-xs text-muted-foreground">{invitations.page + 1} / {pageCount}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={invitations.page >= pageCount - 1}
                onClick={() => navigate({ to: "/dashboard/admin", search: { invitationPage: Math.min(pageCount - 1, invitations.page + 1) } })}
              >Next</Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Grant/revoke curator. Ownership is env-only — never assignable here. */
function RolesSection({ members }: { members: Member[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(member: Member) {
    setBusyId(member.id);
    await setCuratorRole({ data: { userId: member.id, curator: !member.isCurator } });
    await router.invalidate();
    setBusyId(null);
  }

  return (
    <div className="mt-12">
      <h2 className="text-sm font-semibold">Roles</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Curators review submissions. Ownership is configured in the environment (OWNER_USER_IDS) and can never be granted here.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {members.map((member) => (
          <li key={member.id} className="flex flex-col items-stretch justify-between gap-3 rounded-lg border border-border/60 px-4 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {member.username ? `@${member.username}` : member.name || member.email}
                {member.isOwner ? <span className="ml-2 rounded-full border border-border/60 px-1.5 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">Owner</span> : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
            </div>
            <Button
              size="sm"
              variant={member.isCurator ? "outline" : "default"}
              disabled={busyId === member.id}
              onClick={() => toggle(member)}
            >
              {member.isCurator ? "Revoke curator" : "Make curator"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DistributionsSection({ runs }: { runs: PayoutRunSummary[] }) {
  const router = useRouter();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [start, setStart] = useState(runs[0]?.periodEnd?.slice(0, 10) ?? monthStart.toISOString().slice(0, 10));
  const [end, setEnd] = useState(now.toISOString().slice(0, 10));
  const [dollars, setDollars] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const money = (c: number) => `$${(c / 100).toFixed(2)}`;

  async function onRun() {
    setBusy(true);
    setMessage(null);
    const res = await createPayoutRun({
      data: {
        periodStart: new Date(`${start}T00:00:00Z`).toISOString(),
        periodEnd: new Date(`${end}T23:59:59Z`).toISOString(),
        distributableAmount: Math.round(parseFloat(dollars) * 100),
      },
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.error ?? "Run failed.");
      return;
    }
    const t = res.totals!;
    setMessage(
      `Run complete: ${t.creators} creator(s), ${t.installs} install(s) — pool ${money(t.pool)}, paid ${money(t.paid)}, carried ${money(t.carried)}.`,
    );
    setDollars("");
    await router.invalidate();
  }

  return (
    <div className="mt-10">
      <DigestSection />
      <h2 className="mt-10 text-sm font-semibold">Profit-share distributions</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Distributes 30% of the distributable profit to creators, weighted by verified installs in the period.
        Balances under the threshold carry forward. Every run is recorded in the ledger.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card/35 p-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Period start
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-40" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Period end
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-40" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Distributable profit ($)
          <Input value={dollars} onChange={(e) => setDollars(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="1000" inputMode="decimal" className="h-9 w-36" />
        </label>
        <Button onClick={onRun} disabled={busy || !dollars || !start || !end}>Run distribution</Button>
      </div>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
      {runs.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {runs.map((run) => (
            <li key={run.id} className="flex flex-col gap-1 rounded-lg border border-border/60 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                {run.periodStart.slice(0, 10)} → {run.periodEnd.slice(0, 10)} · {run.creators} creator(s) · {run.totalVerifiedInstalls} install(s)
              </span>
              <span className="tabular-nums">
                pool {money(run.creatorPoolAmount)} · paid <span className="text-receipt">{money(run.paid)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Manual trigger for the weekly digest cron — same code path as the schedule. */
function DigestSection() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  return (
    <div>
      <h2 className="text-sm font-semibold">Weekly creator digest</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Runs automatically every Monday 16:00 UTC (Worker cron). Emails each creator their last-7-day
        views, verified installs, and sales — creators with no activity get nothing.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={running}
          onClick={() => {
            setRunning(true);
            setResult(null);
            void runWeeklyDigestNow().then((res) => {
              setRunning(false);
              setResult(res.ok ? `Sent ${res.result?.sent ?? 0} of ${res.result?.creators ?? 0} creators.` : res.error ?? "Failed.");
            });
          }}
        >
          {running ? "Running…" : "Run digest now"}
        </Button>
        {result ? <span className="text-xs text-muted-foreground">{result}</span> : null}
      </div>
    </div>
  );
}
