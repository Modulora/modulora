/* ─────────────────────────────────────────────────────────
 * SETTINGS — entrance storyboard
 *
 *    0ms   page hidden
 *   70ms   heading rises
 *  160ms   profile card rises
 *  260ms   danger zone fades in
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BadgeCheck, Check, Copy, Globe, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { GitHubIcon, XIcon } from "@/components/brand-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchCurrentUser } from "@/lib/session";
import {
  checkHandle,
  getConnections,
  updateProfile,
  usernameChangeAvailableAt,
  type HandleStatus,
  type ProfileInput,
} from "@/lib/profile";
import { DEFAULT_EDITOR_THEME } from "@/lib/highlight";
import { addDomain, discoverDomainConnect, listDomains, removeDomain, verifyDomain, type DomainConnectInfo, type DomainRecord } from "@/lib/domains";
import { DnsRecordsTable } from "@/components/domain/dns-records-table";
import { OneClickDnsSetup } from "@/components/domain/one-click-dns-setup";
import type { DnsRecord, Domain } from "@opencoredev/domain-sdk";
import { linkSocial } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/settings/")({
  loader: async () => {
    const user = await fetchCurrentUser();
    if (!user) throw redirect({ to: "/signin" });
    const connections = await getConnections();
    const domains = await listDomains();
    return { user, connections, domains };
  },
  component: Settings,
});

const TIMING = { heading: 70, card: 160, connections: 230, danger: 300 };
const RISE = {
  offsetY: 8,
  spring: { type: "spring" as const, stiffness: 340, damping: 28 },
};

function Settings() {
  const { user, connections, domains } = Route.useLoaderData();
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
    editorTheme: user.editorTheme ?? DEFAULT_EDITOR_THEME,
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

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <motion.div
        initial={{ opacity: 0, y: RISE.offsetY }}
        animate={{ opacity: stage >= 1 ? 1 : 0, y: stage >= 1 ? 0 : RISE.offsetY }}
        transition={RISE.spring}
      >
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your public identity: avatar, handle, bio, links, and verified connections.
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
            <Label htmlFor="imageUrl">Avatar</Label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                id="imageUrl"
                value={form.imageUrl}
                onChange={(event) => set("imageUrl", event.target.value)}
                placeholder="https://…/avatar.png"
                autoComplete="off"
                className="flex-1"
              />
              <AvatarUpload
                onUploaded={(url) => set("imageUrl", url)}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Upload an image (PNG/JPEG/WebP, under 2 MB) or paste a URL.</p>
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
        {connections.github ? (
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
            <span className="flex items-center gap-2.5 text-sm">
              <GitHubIcon className="size-4" /> GitHub
              {user.githubUsername ? <span className="text-muted-foreground">@{user.githubUsername}</span> : null}
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="size-3.5" /> {user.githubUsername ? "Verified" : "Connected"}</span>
          </div>
        ) : (
          <Button type="button" size="lg" className="w-full gap-2" onClick={() => void linkSocial({ provider: "github", callbackURL: "/dashboard/settings" })}>
            <GitHubIcon className="size-4" /> Connect to GitHub
          </Button>
        )}
        {connections.twitter ? (
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
            <span className="flex items-center gap-2.5 text-sm">
              <XIcon className="size-3.5" /> X
              {user.xUsername ? <span className="text-muted-foreground">@{user.xUsername}</span> : null}
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="size-3.5" /> {user.xUsername ? "Verified" : "Connected"}</span>
          </div>
        ) : (
          <Button type="button" size="lg" variant="outline" className="w-full gap-2" onClick={() => void linkSocial({ provider: "twitter", callbackURL: "/dashboard/settings" })}>
            <XIcon className="size-3.5" /> Connect to X
          </Button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: RISE.offsetY }}
        animate={{ opacity: stage >= 3 ? 1 : 0, y: stage >= 3 ? 0 : RISE.offsetY }}
        transition={RISE.spring}
        className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/35 p-6"
      >
        <DomainsSection initial={domains} />
      </motion.div>

    </div>
  );
}

function DomainsSection({ initial }: { initial: DomainRecord[] }) {
  const [domains, setDomains] = useState<DomainRecord[]>(initial);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});

  async function onAdd() {
    setError(null);
    setAdding(true);
    const res = await addDomain({ data: { domain: input } });
    setAdding(false);
    if (!res.ok || !res.record) {
      setError(res.error ?? "Could not add domain.");
      return;
    }
    setInput("");
    setDomains((list) => (list.some((d) => d.domain === res.record!.domain) ? list : [res.record!, ...list]));
  }

  async function onVerify(domain: string) {
    setBusy(domain);
    setStatus((s) => ({ ...s, [domain]: "" }));
    const res = await verifyDomain({ data: { domain } });
    setBusy(null);
    if (res.verified) {
      setDomains((list) => list.map((d) => (d.domain === domain ? { ...d, verified: true } : d)));
    } else {
      setStatus((s) => ({ ...s, [domain]: res.error ?? "Not verified yet." }));
    }
  }

  async function onRemove(domain: string) {
    await removeDomain({ data: { domain } });
    setDomains((list) => list.filter((d) => d.domain !== domain));
  }

  return (
    <>
      <div>
        <h2 className="text-sm font-semibold">Verified domains</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Prove you own a domain with a DNS TXT record. Verified domains back your website badge and let you sell components from that domain.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="yoursite.com" className="h-9" onKeyDown={(e) => e.key === "Enter" && onAdd()} />
        <Button type="button" size="sm" className="gap-1.5" disabled={adding || !input.trim()} onClick={onAdd}>
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-3">
        {domains.map((d) => (
          <div key={d.domain} className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Globe className="size-4 text-muted-foreground" />
                {d.domain}
                {d.verified ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-500"><BadgeCheck className="size-3.5" /> Verified</span>
                ) : (
                  <span className="text-xs text-amber-500">Pending</span>
                )}
              </span>
              <div className="flex items-center gap-1.5">
                {!d.verified ? (
                  <Button type="button" size="sm" variant="outline" disabled={busy === d.domain} onClick={() => onVerify(d.domain)}>
                    {busy === d.domain ? <Loader2 className="size-3.5 animate-spin" /> : null} Verify
                  </Button>
                ) : null}
                <button type="button" aria-label="Remove domain" onClick={() => onRemove(d.domain)} className="rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>

            {!d.verified ? (
              <div className="mt-3 space-y-3">
                <DomainConnectPanel record={d} />
                <div className="rounded-md border border-border/50 bg-secondary/30 p-3">
                  <p className="mb-2 text-[11px] text-muted-foreground">Add this TXT record at your DNS provider, then Verify:</p>
                  <DnsRecordsTable records={[txtRecordFor(d)]} />
                  {status[d.domain] ? <p className="mt-2 text-[11px] text-amber-500">{status[d.domain]}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {domains.length === 0 ? <p className="text-xs text-muted-foreground">No domains yet.</p> : null}
      </div>
    </>
  );
}

/** Our single ownership-proof record, in domain-sdk's DnsRecord shape. */
function txtRecordFor(d: DomainRecord): DnsRecord {
  return {
    type: "TXT",
    name: d.txtName,
    value: d.txtValue,
    purpose: "ownership",
    required: true,
    status: d.verified ? "valid" : "pending",
    description: "Proves you control this domain.",
  };
}

/**
 * One-click DNS setup via Domain Connect. Discovery is real (see
 * discoverDomainConnect) — the panel renders only when the user's DNS
 * provider actually has Modulora's template onboarded, so nobody ever
 * sees a button that can't work.
 */
function DomainConnectPanel({ record }: { record: DomainRecord }) {
  const [info, setInfo] = useState<DomainConnectInfo | null>(null);
  useEffect(() => {
    let alive = true;
    void discoverDomainConnect({ data: { domain: record.domain } }).then((res) => {
      if (alive) setInfo(res);
    });
    return () => { alive = false; };
  }, [record.domain]);
  if (!info?.supported || !info.applyUrl) return null;
  const domain: Domain = {
    id: record.domain,
    hostname: record.domain,
    provider: info.provider ?? "your DNS provider",
    status: "pending",
    records: [txtRecordFor(record)],
    verification: { status: "pending", records: [txtRecordFor(record)] },
    certificate: { status: "pending" },
    issues: [],
  };
  return (
    <OneClickDnsSetup
      domain={domain}
      dnsProvider={info.provider ?? "your DNS provider"}
      onConnect={() => window.location.assign(info.applyUrl!)}
    />
  );
}

function TxtRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/60">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 font-mono text-[11px]">{value}</code>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </button>
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

function AvatarUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/upload-avatar", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      onUploaded(data.url);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFile} />
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Upload
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </>
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
