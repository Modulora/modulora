/** Appearance: code colors follow app light/dark mode + accessibility. */
import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { HiCheck as Check, HiArrowPath as Loader2 } from "react-icons/hi2";

import { CodeEditor } from "@/components/code-editor";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { fetchCurrentUser } from "@/lib/session";
import { updateProfile, type ProfileInput } from "@/lib/profile";
import {
  COLOR_VISION_MODES,
  resolvePierreCodeTheme,
  type ColorVisionMode,
} from "@/lib/pierre-theme";
import { usePageTheme } from "@/lib/use-page-theme";

const MODE_COPY: Record<ColorVisionMode, { label: string; description: string }> = {
  standard: { label: "Standard", description: "Pierre’s standard syntax palette." },
  protanopia: { label: "Protanopia", description: "Red-blind-safe syntax distinctions." },
  deuteranopia: { label: "Deuteranopia", description: "Green-blind-safe syntax distinctions." },
  tritanopia: { label: "Tritanopia", description: "Blue-yellow-blind-safe syntax distinctions." },
};

const PREVIEW = `export function receipt(total: number) {
  const status = total > 0 ? "recorded" : "empty";
  return { status, total };
}`;

export const Route = createFileRoute("/dashboard/settings/appearance")({
  loader: async () => {
    const user = await fetchCurrentUser();
    if (!user) throw redirect({ to: "/signin" });
    return { user };
  },
  component: AppearancePage,
});

function AppearancePage() {
  const { user } = Route.useLoaderData();
  const router = useRouter();
  const pageTheme = usePageTheme();
  const savedMode = user.colorVisionMode ?? "standard";
  const [mode, setMode] = useState<ColorVisionMode>(savedMode);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeTheme = resolvePierreCodeTheme(pageTheme, mode);

  async function onSave() {
    setPending(true);
    setError(null);
    const input: ProfileInput = {
      name: user.name ?? "",
      username: user.username ?? "",
      imageUrl: user.image ?? "",
      bio: user.bio ?? "",
      websiteUrl: user.websiteUrl ?? "",
      githubUrl: user.githubUrl ?? "",
      xUrl: user.xUrl ?? "",
      colorVisionMode: mode,
    };
    const result = await updateProfile({ data: input });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "The accessibility setting was not saved. Try again.");
      return;
    }
    setSaved(true);
    await router.invalidate();
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <DashboardPageHeader title="Appearance" description="Code colors follow Modulora’s light or dark appearance automatically." />

      <section aria-labelledby="syntax-accessibility" className="rounded-xl border border-border/60 bg-card/40 p-6">
        <h2 id="syntax-accessibility" className="text-xl font-semibold">Syntax accessibility</h2>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
          Choose the color-vision profile that makes code easiest to distinguish. Editors and diffs use the aligned Pierre palette everywhere; separate code-theme switching is disabled.
        </p>

        <div role="radiogroup" aria-label="Color vision profile" className="mt-5 grid gap-2 sm:grid-cols-2">
          {COLOR_VISION_MODES.map((value) => {
            const copy = MODE_COPY[value];
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setMode(value)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
                  event.preventDefault();
                  const current = COLOR_VISION_MODES.indexOf(mode);
                  const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
                  const next = COLOR_VISION_MODES[(current + (forward ? 1 : -1) + COLOR_VISION_MODES.length) % COLOR_VISION_MODES.length]!;
                  setMode(next);
                  requestAnimationFrame(() => {
                    (document.querySelector(`[role="radiogroup"] [aria-checked="true"]`) as HTMLElement | null)?.focus();
                  });
                }}
                className={`min-h-20 rounded-lg border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99] motion-reduce:active:scale-100 ${
                  active ? "border-foreground bg-secondary/55" : "border-border text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                }`}
              >
                <span className="flex items-center justify-between gap-3 text-sm font-medium text-foreground">
                  {copy.label} {active ? <Check className="size-4" /> : null}
                </span>
                <span className="mt-1 block text-xs leading-relaxed">{copy.description}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-3 py-2">
            <span className="text-sm font-medium">Preview</span>
            <span className="font-mono text-xs text-muted-foreground">{codeTheme}</span>
          </div>
          <div className="h-48 bg-code-background">
            <CodeEditor path="receipt.ts" value={PREVIEW} themeId={codeTheme} readOnly />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {error ? <span className="text-sm text-destructive" role="alert">{error}</span> : null}
          {saved ? <span className="flex items-center gap-1 text-sm text-receipt"><Check className="size-4" /> Saved</span> : null}
          <Button type="button" onClick={onSave} disabled={pending || mode === savedMode}>
            {pending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : null}
            Save accessibility
          </Button>
        </div>
      </section>
    </div>
  );
}
