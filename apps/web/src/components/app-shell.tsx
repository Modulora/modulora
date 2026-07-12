/* ─────────────────────────────────────────────────────────
 * APP SHELL — nav entrance storyboard
 *
 * Read top-to-bottom. Each `at` value is ms after mount.
 *
 *    0ms   nav bar hidden (translateY -8, opacity 0)
 *   60ms   nav bar settles in (fade + slide down)
 *  140ms   brand lockup fades in
 *  220ms   nav links + auth control fade in (staggered 60ms)
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { LayoutDashboard, LogOut, Settings, User as UserIcon } from "lucide-react";

import { Logo } from "@/components/logo";
import { GitHubIcon } from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import type { CurrentUser } from "@/lib/session";

const TIMING = {
  bar: 60, // nav bar settles in
  brand: 140, // brand lockup fades in
  actions: 220, // nav links + auth control begin
};

/* Nav bar container */
const BAR = {
  offsetY: -8, // px slide from
  spring: { type: "spring" as const, stiffness: 320, damping: 30 },
};

/* Brand lockup */
const BRAND = {
  spring: { type: "spring" as const, stiffness: 300, damping: 28 },
};

/* Nav actions (links + auth control), staggered */
const ACTIONS = {
  stagger: 0.06, // seconds between each
  offsetY: 6, // px rise from
  spring: { type: "spring" as const, stiffness: 350, damping: 28 },
};

const NAV_LINKS = [
  { label: "Components", to: "/components" as const },
];

export function AppShell({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: ReactNode;
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), TIMING.bar));
    timers.push(setTimeout(() => setStage(2), TIMING.brand));
    timers.push(setTimeout(() => setStage(3), TIMING.actions));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <motion.header
        initial={{ opacity: 0, y: BAR.offsetY }}
        animate={{
          opacity: stage >= 1 ? 1 : 0,
          y: stage >= 1 ? 0 : BAR.offsetY,
        }}
        transition={BAR.spring}
        className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: stage >= 2 ? 1 : 0 }}
            transition={BRAND.spring}
          >
            <Link
              to="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <Logo className="size-6 text-foreground" />
              <span className="text-sm font-extrabold tracking-tight text-foreground">
                MODULORA
              </span>
            </Link>
          </motion.div>

          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link, i) => (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, y: ACTIONS.offsetY }}
                animate={{
                  opacity: stage >= 3 ? 1 : 0,
                  y: stage >= 3 ? 0 : ACTIONS.offsetY,
                }}
                transition={{ ...ACTIONS.spring, delay: i * ACTIONS.stagger }}
              >
                <Link
                  to={link.to}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: ACTIONS.offsetY }}
              animate={{
                opacity: stage >= 3 ? 1 : 0,
                y: stage >= 3 ? 0 : ACTIONS.offsetY,
              }}
              transition={{
                ...ACTIONS.spring,
                delay: NAV_LINKS.length * ACTIONS.stagger,
              }}
              className="ml-2"
            >
              {user ? <UserMenu user={user} /> : <SignInButton />}
            </motion.div>
          </nav>
        </div>
      </motion.header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}

function SignInButton() {
  return (
    <Button asChild size="sm" className="gap-2">
      <Link to="/signin">
        <GitHubIcon className="size-4" />
        Sign in
      </Link>
    </Button>
  );
}

function UserMenu({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const navigate = useNavigate();
  const handle = user.username ? `@${user.username}` : user.name;

  async function handleSignOut() {
    await signOut();
    await router.invalidate();
    navigate({ to: "/" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 py-1 pl-1 pr-3 text-sm transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Account menu"
        >
          <Avatar user={user} className="size-7" />
          <span className="max-w-[10rem] truncate font-medium">{handle}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard">
            <LayoutDashboard />
            Dashboard
          </Link>
        </DropdownMenuItem>
        {user.username ? (
          <DropdownMenuItem asChild>
            <Link to="/$username" params={{ username: user.username }}>
              <UserIcon />
              Profile
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Avatar({ user, className }: { user: CurrentUser; className?: string }) {
  const initial = (user.username ?? user.name ?? "?").charAt(0).toUpperCase();
  if (user.image) {
    return (
      <img
        src={user.image}
        alt=""
        className={`${className ?? ""} rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`${className ?? ""} flex items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
