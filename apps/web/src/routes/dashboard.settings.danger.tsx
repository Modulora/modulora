/** Danger zone: irreversible account actions. */
import { useEffect, useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
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
import { deleteAccount } from "@/lib/profile";

export const Route = createFileRoute("/dashboard/settings/danger")({
  loader: async () => {
    const user = await fetchCurrentUser();
    if (!user) throw redirect({ to: "/signin" });
    return { identifier: user.username ?? user.email };
  },
  component: DangerPage,
});

function DangerPage() {
  const { identifier } = Route.useLoaderData();
  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Danger zone</h1>
        <p className="mt-1 text-sm text-muted-foreground">Irreversible actions. Read carefully.</p>
      </div>
      <div className="flex flex-col gap-5 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <DeleteAccountSection identifier={identifier} />
      </div>
    </div>
  );
}

function DeleteAccountSection({ identifier }: { identifier: string }) {
  const router = useRouter();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
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
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Delete account</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Permanently deletes your account, namespace, and published components.
        </p>
      </div>
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setConfirm(""); setError(null); } }}>
        <DialogTrigger asChild>
          <Button type="button" variant="destructive">Delete account</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your account, namespace, and published components. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex flex-col gap-2">
            <Label htmlFor="confirm-delete">
              Type <span className="font-mono text-foreground">{identifier}</span> to confirm
            </Label>
            <Input id="confirm-delete" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(null); }} placeholder={identifier} autoComplete="off" aria-invalid={!!error} />
          </div>
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
          <div className="mt-5 flex flex-col gap-2">
            <HoldToConfirm label={pending ? "Deleting…" : "Hold to delete account"} disabled={!matches || pending} onConfirm={onDelete} />
            <p className="text-center text-[11px] text-muted-foreground">Press and hold to confirm.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HoldToConfirm({ label, disabled, onConfirm }: { label: string; disabled: boolean; onConfirm: () => void; }) {
  const DURATION = 1500;
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancel() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setHolding(false);
  }
  function start() {
    if (disabled) return;
    setHolding(true);
    timer.current = setTimeout(() => { setHolding(false); timer.current = null; onConfirm(); }, DURATION);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      className="relative flex h-10 items-center justify-center overflow-hidden rounded-md border border-destructive/50 text-sm font-medium text-destructive transition-colors select-none disabled:pointer-events-none disabled:opacity-50"
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-destructive"
        style={{
          clipPath: holding ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transition: holding
            ? `clip-path ${DURATION}ms linear`
            : "clip-path 200ms cubic-bezier(0.23,1,0.32,1)",
        }}
      />
      <span className={`relative transition-colors ${holding ? "text-white" : ""}`}>{label}</span>
    </button>
  );
}
