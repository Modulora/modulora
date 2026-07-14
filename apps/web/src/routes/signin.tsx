/* ─────────────────────────────────────────────────────────
 * SIGN-IN — entrance storyboard
 *
 * Read top-to-bottom. Each `at` value is ms after mount.
 *
 *    0ms   backdrop visible; card hidden (scale 0.97, opacity 0)
 *  120ms   card scales + fades in
 *  260ms   brand lockup + heading fade in
 *  380ms   GitHub button rises (primary action)
 *  480ms   divider + email/password fallback fade in
 * ───────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { alphaGateActive } from "@/lib/access";
import { motion } from "motion/react";
import { HiArrowPath as Loader2 } from "react-icons/hi2";


import { Logo } from "@/components/logo";
import { GitHubIcon } from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";

const fetchGate = createServerFn({ method: "GET" }).handler(async () => ({
  gated: alphaGateActive(),
}));

export const Route = createFileRoute("/signin")({
  loader: () => fetchGate(),
  component: SignIn,
});

const TIMING = {
  card: 120, // card scales + fades in
  heading: 260, // brand + heading
  github: 380, // primary action rises
  fallback: 480, // divider + email/password
};

/* Sign-in card */
const CARD = {
  initialScale: 0.97,
  spring: { type: "spring" as const, stiffness: 280, damping: 26 },
};

/* Rising elements (heading, github, fallback) */
const RISE = {
  offsetY: 8,
  spring: { type: "spring" as const, stiffness: 340, damping: 28 },
};

/* Backdrop — matches the homepage near-black palette */
const BACKDROP =
  "radial-gradient(120% 90% at 50% 0%, #1c1c1c 0%, #101010 40%, #050505 100%)";

function SignIn() {
  const { gated } = Route.useLoaderData();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), TIMING.card));
    timers.push(setTimeout(() => setStage(2), TIMING.heading));
    timers.push(setTimeout(() => setStage(3), TIMING.github));
    timers.push(setTimeout(() => setStage(4), TIMING.fallback));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="relative flex min-h-svh items-center justify-center px-6 py-16"
      style={{ background: BACKDROP }}
    >
      <motion.div
        initial={{ opacity: 0, scale: CARD.initialScale }}
        animate={{
          opacity: stage >= 1 ? 1 : 0,
          scale: stage >= 1 ? 1 : CARD.initialScale,
        }}
        transition={CARD.spring}
        className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/70 p-8 backdrop-blur-md"
      >
        {gated ? (
          <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5 text-xs leading-relaxed text-amber-500">
            Modulora is in a limited alpha — sign-in works only for invited accounts. Join the waitlist on the homepage to get access.
          </div>
        ) : null}
        <motion.div
          initial={{ opacity: 0, y: RISE.offsetY }}
          animate={{
            opacity: stage >= 2 ? 1 : 0,
            y: stage >= 2 ? 0 : RISE.offsetY,
          }}
          transition={RISE.spring}
          className="flex flex-col items-center gap-4 text-center"
        >
          <Logo className="size-9 text-foreground" />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold tracking-tight">
              Sign in to Modulora
            </h1>
            <p className="text-sm text-muted-foreground">
              Continue with GitHub to publish and manage your components.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: RISE.offsetY }}
          animate={{
            opacity: stage >= 3 ? 1 : 0,
            y: stage >= 3 ? 0 : RISE.offsetY,
          }}
          transition={RISE.spring}
          className="mt-7"
        >
          <GitHubSignIn />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 4 ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="mt-6"
        >
          <EmailFallback />
        </motion.div>
      </motion.div>
    </div>
  );
}

function GitHubSignIn() {
  const [pending, setPending] = useState(false);

  async function onGitHub() {
    setPending(true);
    try {
      await signIn.social({ provider: "github", callbackURL: "/dashboard" });
    } catch {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      className="w-full gap-2"
      onClick={onGitHub}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <GitHubIcon className="size-4" />
      )}
      Continue with GitHub
    </Button>
  );
}

function EmailFallback() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const navigate = useNavigate();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await signIn.email({ email, password });
    if (result.error) {
      setError(result.error.message ?? "Could not sign in.");
      setPending(false);
      return;
    }
    await router.invalidate();
    navigate({ to: "/dashboard" });
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border/60" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="transition-colors hover:text-foreground"
        >
          Use email instead
        </button>
        <span className="h-px flex-1 bg-border/60" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border/60" />
        <span>or with email</span>
        <span className="h-px flex-1 bg-border/60" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Sign in
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        No account?{" "}
        <Link to="/" className="underline hover:text-foreground">
          Join the waitlist
        </Link>
      </p>
    </form>
  );
}
