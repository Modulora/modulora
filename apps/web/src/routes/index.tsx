/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — waitlist homepage
 *
 * Read top-to-bottom. Each `at` value is ms after mount.
 *
 *    0ms   shader background visible (black/gray grain)
 *  200ms   logo + wordmark lockup fades in
 *  450ms   headline rises, opacity 0 → 1, y 16 → 0
 *  650ms   subline rises (creator-first positioning)
 *  950ms   waitlist card scales 0.96 → 1.0, fades in
 * 1600ms   beui credit fades in at the bottom
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { HiCheck as Check, HiArrowPath as Loader2, HiXMark as X } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { XIcon, DiscordIcon } from "@/components/brand-icons";
import { ShaderBackground } from "@/components/motion/shader-background";
import {
  checkUsername,
  joinWaitlist,
  type UsernameCheck,
} from "../lib/waitlist";

const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  return { mode: process.env.LANDING_MODE === "platform" ? ("platform" as const) : ("waitlist" as const) };
});

export const Route = createFileRoute("/")({
  loader: async () => {
    const data = await getHomeData();
    if (data.mode === "platform") throw redirect({ to: "/components" });
    return data;
  },
  component: Home,
});

const TIMING = {
  wordmark: 200, // wordmark fades in
  headline: 450, // headline rises
  subline: 650, // supporting line rises
  card: 950, // waitlist card appears
  credit: 1600, // beui credit fades in
};

/* Static CSS fallback shown until the WebGL shader compiles — same palette */
const BACKDROP_FALLBACK = {
  fadeInSeconds: 1.2, // shader cross-fade duration over the fallback
  css: "radial-gradient(120% 90% at 75% 10%, #2e2e2e 0%, #1c1c1c 35%, #0a0a0a 70%, #050505 100%)",
};

/* Shader backdrop — primarily black and gray */
const BACKDROP = {
  variant: "grain-gradient" as const,
  colors: ["#0a0a0a", "#1c1c1c", "#2e2e2e"], // near-black grays
  colorBack: "#050505", // page base
  softness: 0.8,
  intensity: 0.15,
  noise: 0.35,
  shape: "corners" as const,
  speed: 0.4,
};

/* Headline block */
const HEADLINE = {
  offsetY: 16, // px rise distance
  spring: { type: "spring" as const, stiffness: 260, damping: 28 },
};

/* Waitlist card */
const CARD = {
  initialScale: 0.96, // scale before appearing
  spring: { type: "spring" as const, stiffness: 260, damping: 26 },
};

/* Username availability check */
const USERNAME_CHECK = {
  debounceMs: 400, // idle time before hitting the server
  minLength: 2, // don't check below this
};

const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,24}$/;

type FieldStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "valid"; message: string }
  | { kind: "invalid"; message: string };

function StatusLine({ status }: { status: FieldStatus }) {
  if (status.kind === "idle") return <div className="h-4" aria-hidden />;
  return (
    <div className="flex h-4 items-center gap-1.5 text-xs" role="status">
      {status.kind === "checking" ? (
        <>
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Checking…</span>
        </>
      ) : status.kind === "valid" ? (
        <>
          <Check className="size-3 text-receipt" />
          <span className="text-receipt">{status.message}</span>
        </>
      ) : (
        <>
          <X className="size-3 text-destructive" />
          <span className="text-destructive">{status.message}</span>
        </>
      )}
    </div>
  );
}

function Home() {
  return <WaitlistHome />;
}

function WaitlistHome() {
  const [stage, setStage] = useState(0);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<FieldStatus>({
    kind: "idle",
  });
  const [emailStatus, setEmailStatus] = useState<FieldStatus>({ kind: "idle" });
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reserved, setReserved] = useState<string | null>(null);
  const [memberNumber, setMemberNumber] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), TIMING.wordmark),
      setTimeout(() => setStage(2), TIMING.headline),
      setTimeout(() => setStage(3), TIMING.subline),
      setTimeout(() => setStage(4), TIMING.card),
      setTimeout(() => setStage(5), TIMING.credit),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  function onUsernameChange(raw: string) {
    const value = raw.toLowerCase();
    setUsername(value);
    setSubmitError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < USERNAME_CHECK.minLength) {
      setUsernameStatus({ kind: "idle" });
      return;
    }
    setUsernameStatus({ kind: "checking" });
    const seq = ++requestSeq.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const result: UsernameCheck = await checkUsername({
          data: { username: value },
        });
        if (seq !== requestSeq.current) return; // stale response
        if (result.state === "available") {
          setUsernameStatus({
            kind: "valid",
            message: `@${value} is available`,
          });
        } else if (result.state === "taken") {
          setUsernameStatus({
            kind: "invalid",
            message: `@${value} is already reserved`,
          });
        } else if (result.state === "invalid") {
          setUsernameStatus({ kind: "invalid", message: result.reason });
        } else {
          setUsernameStatus({ kind: "idle" });
        }
      } catch {
        if (seq === requestSeq.current) setUsernameStatus({ kind: "idle" });
      }
    }, USERNAME_CHECK.debounceMs);
  }

  function onEmailBlur() {
    if (!email) {
      setEmailStatus({ kind: "idle" });
    } else if (EMAIL_PATTERN.test(email.trim().toLowerCase())) {
      setEmailStatus({ kind: "valid", message: "Looks good" });
    } else {
      setEmailStatus({ kind: "invalid", message: "Enter a valid email" });
    }
  }

  const canSubmit =
    usernameStatus.kind === "valid" &&
    EMAIL_PATTERN.test(email.trim().toLowerCase()) &&
    !pending;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setSubmitError(null);
    try {
      const result = await joinWaitlist({ data: { username, email } });
      if (result.ok && result.username) {
        setReserved(result.username);
        setMemberNumber(result.memberNumber ?? null);
      } else setSubmitError(result.error ?? "Something went wrong.");
    } catch {
      setSubmitError("Something went wrong. Try again shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#050505]">
      <div className="absolute inset-0">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: BACKDROP_FALLBACK.css }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: BACKDROP_FALLBACK.fadeInSeconds,
            ease: "easeOut",
          }}
          className="absolute inset-0"
        >
          <ShaderBackground {...BACKDROP} />
        </motion.div>
      </div>

      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 1 ? 1 : 0 }}
          className="flex items-center gap-3"
        >
          <Logo className="size-9 text-foreground" />
          <p className="text-2xl font-extrabold tracking-tight text-foreground">
            MODULORA
          </p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: HEADLINE.offsetY }}
          animate={{
            opacity: stage >= 2 ? 1 : 0,
            y: stage >= 2 ? 0 : HEADLINE.offsetY,
          }}
          transition={HEADLINE.spring}
          className="mt-6 max-w-2xl text-balance text-center text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
        >
          Discover your next great&nbsp;component.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: HEADLINE.offsetY }}
          animate={{
            opacity: stage >= 3 ? 1 : 0,
            y: stage >= 3 ? 0 : HEADLINE.offsetY,
          }}
          transition={HEADLINE.spring}
          className="mt-5 max-w-md text-balance text-center text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          A creator-first way to find components from the world's best
          design&nbsp;engineers.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: CARD.initialScale }}
          animate={{
            opacity: stage >= 4 ? 1 : 0,
            scale: stage >= 4 ? 1 : CARD.initialScale,
          }}
          transition={CARD.spring}
          className="mt-10 w-full max-w-sm rounded-xl border border-border/60 bg-card/70 p-6 backdrop-blur-md"
        >
          {reserved ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Check className="size-6 text-receipt" />
              {memberNumber ? (
                <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1 font-mono text-xs tracking-wider text-muted-foreground">
                  MEMBER #{memberNumber}
                </span>
              ) : null}
              <p className="font-semibold">You're on the list.</p>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground">@{reserved}</span> is
                reserved for you. We'll email you when Modulora opens.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Reserve your username</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    @
                  </span>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={40}
                    placeholder="northstar"
                    className="pl-8"
                    value={username}
                    onChange={(e) => onUsernameChange(e.target.value)}
                    aria-invalid={usernameStatus.kind === "invalid"}
                    required
                  />
                </div>
                <StatusLine status={usernameStatus} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailStatus({ kind: "idle" });
                  }}
                  onBlur={onEmailBlur}
                  aria-invalid={emailStatus.kind === "invalid"}
                  required
                />
                <StatusLine status={emailStatus} />
              </div>

              {submitError ? (
                <p className="text-sm text-destructive">{submitError}</p>
              ) : null}

              <Button type="submit" className="mt-2" disabled={!canSubmit}>
                {pending ? "Reserving…" : "Join the waitlist"}
              </Button>
            </form>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 5 ? 1 : 0 }}
          className="absolute bottom-6 flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-4">
            <a
              href="https://x.com/ModuloraDev"
              target="_blank"
              rel="noreferrer"
              aria-label="Modulora on X"
              className="text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <XIcon className="size-4" />
            </a>
            <a
              href="https://discord.gg/AvxqeHGca"
              target="_blank"
              rel="noreferrer"
              aria-label="Modulora on Discord"
              className="text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <DiscordIcon className="size-4" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Background by{" "}
            <a
              href="https://beui.dev"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              beui
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
