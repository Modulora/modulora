import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { HiSquares2X2 as LayoutDashboard, HiArrowRightOnRectangle as LogOut, HiChatBubbleLeft as MessageSquare, HiCog6Tooth as Settings, HiSparkles as Sparkles, HiUser as UserIcon } from "react-icons/hi2";


import { FeedbackDialog } from "@/components/feedback-dialog";
import { submitFeedback } from "@/lib/feedback";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandSearch } from "@/components/command-search";
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
import { isRenderableImageUrl } from "@/lib/image-url";

const NAV_LINKS = [
  { label: "Components", to: "/components" as const },
  { label: "Docs", to: "/docs/$" as const, params: { _splat: "" } },
];

export function AppShell({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: ReactNode;
}) {
  // Review lives in the dashboard sidebar (Curation section) — the top nav
  // stays the same for everyone.
  const navLinks = NAV_LINKS;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6">
          <div>
            <Link
              to="/"
              className="flex min-h-11 items-center gap-2.5 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Logo className="size-6 text-foreground" />
              <span className="text-sm font-extrabold tracking-tight text-foreground">
                MODULORA
              </span>
            </Link>
          </div>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => (
              <div key={link.to} className="hidden sm:block">
                <Link
                  to={link.to}
                  params={"params" in link ? (link.params as never) : undefined}
                  className="flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&.active]:text-foreground"
                >
                  {link.label}
                </Link>
              </div>
            ))}

            <div className="ml-1 sm:ml-2">
              {user ? <UserMenu user={user} /> : <SignInButton />}
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <CommandSearch />

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Modulora</span>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-0 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center sm:justify-end">
            <Link to="/docs/$" params={{ _splat: "" }} className="transition-colors hover:text-foreground">Docs</Link>
            <Link to="/pricing" className="transition-colors hover:text-foreground">Pricing</Link>
            <Link to="/profit-share" className="transition-colors hover:text-foreground">Earnings</Link>
            <Link to="/publishing-policy" className="transition-colors hover:text-foreground">Publishing policy</Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <a href="https://github.com/Modulora" target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">GitHub</a>
            <ThemeToggle />
          </nav>
        </div>
      </footer>
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
  // Prefer the person's name once set; fall back to the plain username.
  const handle = user.name?.trim() ? user.name : (user.username ?? "Account");

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

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
          className="flex size-11 items-center justify-center rounded-full border border-border/60 bg-card/60 p-1 text-sm transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:h-10 sm:w-auto sm:gap-2 sm:pl-1 sm:pr-3"
          aria-label="Account menu"
        >
          <Avatar user={user} className="size-7" />
          <span className="hidden max-w-[10rem] truncate font-medium sm:block">{handle}</span>
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
          <Link to="/dashboard/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/pricing">
            <Sparkles className={user.isPlus ? "text-foreground" : undefined} />
            {user.isPlus ? "Modulora Plus" : "Upgrade to Plus"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}>
          <MessageSquare />
          Send feedback
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={(open) => {
          setFeedbackOpen(open);
          if (!open) {
            setFeedbackDone(false);
            setFeedbackError(null);
          }
        }}
        busy={feedbackBusy}
        done={feedbackDone}
        error={feedbackError}
        onSubmit={(message) => {
          setFeedbackBusy(true);
          setFeedbackError(null);
          void submitFeedback({ data: { message, page: window.location.pathname } }).then((res) => {
            setFeedbackBusy(false);
            if (!res.ok) {
              setFeedbackError(res.error ?? "Could not send.");
              return;
            }
            setFeedbackDone(true);
            setTimeout(() => setFeedbackOpen(false), 1200);
          });
        }}
      />
    </DropdownMenu>
  );
}

function Avatar({ user, className }: { user: CurrentUser; className?: string }) {
  const initial = (user.username ?? user.name ?? "?").charAt(0).toUpperCase();
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImageFailed(false);
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setImageFailed(true);
  }, [user.image]);

  if (isRenderableImageUrl(user.image) && !imageFailed) {
    return (
      <img
        ref={imageRef}
        src={user.image}
        alt=""
        onError={() => setImageFailed(true)}
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
