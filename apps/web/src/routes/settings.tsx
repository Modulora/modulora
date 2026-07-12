/* ─────────────────────────────────────────────────────────
 * SETTINGS — entrance storyboard
 *
 *    0ms   page hidden
 *   70ms   heading rises
 *  160ms   profile card rises
 *  260ms   danger zone fades in
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check, Github, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchCurrentUser } from "@/lib/session";
import {
  checkHandle,
  deleteAccount,
  getConnections,
  updateProfile,
  usernameChangeAvailableAt,
  type HandleStatus,
  type ProfileInput,
} from "@/lib/profile";
import { changePassword, linkSocial, signOut } from "@/lib/auth-client";

export const Route = createFileRoute("/settings")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  loader: async () => {
    const user = await fetchCurrentUser();
    if (!user) throw redirect({ to: "/signin" });
    const connections = await getConnections();
    return { user, connections };
  },
  component: Settings,
});

const TIMING = { heading: 70, card: 160, connections: 230, danger: 300 };
const RISE = {
  offsetY: 8,
  spring: { type: "spring" as const, stiffness: 340, damping: 28 },
};

function Settings() {
  const { user, connections } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [form, setForm] = useState<ProfileInput>({
    username: user.username ?? "",
    imageUrl: user.image ?? "",
    bio: user.bio ?? "",
    websiteUrl: user.websiteUrl ?? "",
    githubUrl: user.githubUrl ?? "",
    xUrl: user.xUrl ?? "",
  });
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<keyof ProfileInput | null>(null);
  const [handle, setHandle] = useState<HandleStatus>({ state: "current" });
  const handleSeq = useRef(0);
  const usernameLockedUntil = usernameChangeAvailableAt(user.usernameChangedAt);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), TIMING.heading),
      setTimeout(() => setStage(2), TIMING.card),
      setTimeout(() => setStage(3), TIMING.connections),
      setTimeout(() => setStage(4), TIMING.danger),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (form.username === (user.username ?? "")) {
      setHandle({ state: "current" });
      return;
    }
    const seq = ++handleSeq.current;
    const timer = setTimeout(async () => {
      const result = await checkHandle({ data: { username: form.username } });
      if (seq === handleSeq.current) setHandle(result);
    }, 300);
    return () => clearTimeout(timer);
  }, [form.username, user.username]);

  function set<K extends keyof ProfileInput>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
    if (errorField === key) {
      setError(null);
      setErrorField(null);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setErrorField(null);
    const result = await updateProfile({ data: form });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save.");
      setErrorField(result.field ?? null);
      return;
    }
    setSaved(true);
    await router.invalidate();
  }

  async function onSignOut() {
    await signOut();
    await router.invalidate();
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <motion.div
        initial={{ opacity: 0, y: RISE.offsetY }}
        animate={{ opacity: stage >= 1 ? 1 : 0, y: stage >= 1 ? 0 : RISE.offsetY }}
        transition={RISE.spring}
      >
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your public profile and account.
        </p>
      </motion.div>

      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: RISE.offsetY }}
        animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : RISE.offsetY }}
        transition={RISE.spring}
        className="flex flex-col gap-5 rounded-xl border border-border/60 bg-card/40 p-6"
      >
        <div className="flex items-center gap-4">
          <Avatar username={form.username} name={user.name} imageUrl={form.imageUrl} />
          <div className="flex-1">
            <Label htmlFor="imageUrl">Avatar URL</Label>
            <Input
              id="imageUrl"
              value={form.imageUrl}
              onChange={(event) => set("imageUrl", event.target.value)}
              placeholder="https://…/avatar.png"
              autoComplete="off"
              className="mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">Paste an image URL. Upload lands with hosted storage.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Username</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">@</span>
            <Input
              id="username"
              value={form.username}
              onChange={(event) => set("username", event.target.value)}
              aria-invalid={errorField === "username"}
              autoComplete="off"
              disabled={usernameLockedUntil !== null}
              className="flex-1"
            />
          </div>
          {usernameLockedUntil ? (
            <p className="text-xs text-muted-foreground">
              Usernames can change once every 15 days. Next change available on{" "}
              {new Date(usernameLockedUntil).toLocaleDateString("en-US", { dateStyle: "medium" })}.
            </p>
          ) : (
            <HandleStatusLine status={handle} username={form.username} />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            value={form.bio}
            onChange={(event) => set("bio", event.target.value)}
            rows={3}
            maxLength={280}
            placeholder="Design engineer building accessible components."
            className="min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <p className="text-right text-xs text-muted-foreground">{form.bio.length}/280</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="websiteUrl" label="Website" value={form.websiteUrl} onChange={(v) => set("websiteUrl", v)} placeholder="you.dev" />
          <Field id="githubUrl" label="GitHub" value={form.githubUrl} onChange={(v) => set("githubUrl", v)} placeholder="github.com/you" />
          <Field id="xUrl" label="X" value={form.xUrl} onChange={(v) => set("xUrl", v)} placeholder="x.com/you" />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Signed in as {user.email}
          </span>
          <div className="flex items-center gap-3">
            {error ? <span className="text-xs text-destructive">{error}</span> : null}
            {saved ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Check className="size-3.5" /> Saved
              </span>
            ) : null}
            <Button type="submit" disabled={pending || handle.state === "taken" || handle.state === "invalid"}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </div>
      </motion.form>

      <motion.div
        initial={{ opacity: 0, y: RISE.offsetY }}
        animate={{ opacity: stage >= 3 ? 1 : 0, y: stage >= 3 ? 0 : RISE.offsetY }}
        transition={RISE.spring}
        className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/40 p-6"
      >
        <div>
          <h2 className="text-sm font-semibold">Connections</h2>
          <p className="mt-1 text-xs text-muted-foreground">Link accounts to sign in and publish.</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
          <span className="flex items-center gap-2.5 text-sm"><Github className="size-4" /> GitHub</span>
          {connections.github ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="size-3.5" /> Connected</span>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => void linkSocial({ provider: "github", callbackURL: "/settings" })}>Connect</Button>
          )}
        </div>
      </motion.div>

      {connections.hasPassword ? (
        <motion.div
          initial={{ opacity: 0, y: RISE.offsetY }}
          animate={{ opacity: stage >= 4 ? 1 : 0, y: stage >= 4 ? 0 : RISE.offsetY }}
          transition={RISE.spring}
        >
          <PasswordSection />
        </motion.div>
      ) : null}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 4 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-5 rounded-xl border border-destructive/30 bg-destructive/5 p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="mt-1 text-xs text-muted-foreground">End this session on this device.</p>
          </div>
          <Button type="button" variant="outline" onClick={onSignOut}>Sign out</Button>
        </div>
        <div className="h-px bg-destructive/20" />
        <DeleteAccountSection identifier={user.username ?? user.email} />
      </motion.div>
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
        {done ? <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="size-3.5" /> Updated</span> : null}
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Update password</Button>
      </div>
    </form>
  );
}

function DeleteAccountSection({ identifier }: { identifier: string }) {
  const router = useRouter();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = confirm.trim().toLowerCase() === identifier.toLowerCase();

  async function onDelete() {
    setPending(true);
    setError(null);
    const result = await deleteAccount({ data: { confirmUsername: confirm } });
    if (!result.ok) {
      setError(result.error ?? "Could not delete account.");
      setPending(false);
      return;
    }
    await router.invalidate();
    navigate({ to: "/" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">Delete account</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Permanently deletes your account, namespace, and published components. This cannot be undone.
          Type <span className="font-mono text-foreground">{identifier}</span> to confirm.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Input value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(null); }} placeholder={identifier} autoComplete="off" className="max-w-xs" />
        <Button type="button" variant="destructive" disabled={!matches || pending} onClick={onDelete}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Delete account
        </Button>
      </div>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

function HandleStatusLine({ status, username }: { status: HandleStatus; username: string }) {
  if (status.state === "invalid") {
    return <p className="flex items-center gap-1.5 text-xs text-destructive"><X className="size-3" /> {status.reason}</p>;
  }
  if (status.state === "taken") {
    return <p className="flex items-center gap-1.5 text-xs text-destructive"><X className="size-3" /> @{username} is taken.</p>;
  }
  if (status.state === "available") {
    return <p className="flex items-center gap-1.5 text-xs text-emerald-400"><Check className="size-3" /> @{username} is available.</p>;
  }
  return (
    <p className="text-xs text-muted-foreground">
      Your components live at modulora.dev/{username || "handle"}.
    </p>
  );
}

function Avatar({ username, name, imageUrl }: { username: string; name: string; imageUrl: string }) {
  const initial = (username || name || "?").charAt(0).toUpperCase();
  return (
    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-secondary text-xl font-semibold text-secondary-foreground">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="size-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
      ) : (
        initial
      )}
    </span>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}
