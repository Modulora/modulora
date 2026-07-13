/** Appearance: how Modulora looks for you — the code theme. */
import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Label } from "@/components/ui/label";
import { CodeThemePicker } from "@/components/code-theme-picker";
import { fetchCurrentUser } from "@/lib/session";
import { updateProfile, type ProfileInput } from "@/lib/profile";
import { DEFAULT_EDITOR_THEME } from "@/lib/highlight";

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
  const [theme, setTheme] = useState(user.editorTheme ?? DEFAULT_EDITOR_THEME);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setPending(true);
    setError(null);
    // updateProfile takes the full profile; submit current values with only the theme changed.
    const input: ProfileInput = {
      username: user.username ?? "",
      imageUrl: user.image ?? "",
      bio: user.bio ?? "",
      websiteUrl: user.websiteUrl ?? "",
      githubUrl: user.githubUrl ?? "",
      xUrl: user.xUrl ?? "",
      editorTheme: theme,
    };
    const res = await updateProfile({ data: input });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save.");
      return;
    }
    setSaved(true);
    await router.invalidate();
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <DashboardPageHeader title="Appearance" description="How Modulora looks for you." />

      <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/40 p-6">
        <div className="flex flex-col gap-2">
          <Label>Code theme</Label>
          <CodeThemePicker value={theme} onChange={setTheme} />
          <p className="text-xs text-muted-foreground">Syntax highlighting for source code across Modulora — the editor, component pages, and previews.</p>
        </div>
        <div className="flex items-center justify-end gap-3">
          {error ? <span className="text-xs text-destructive">{error}</span> : null}
          {saved ? (
            <span className="flex items-center gap-1 text-xs text-receipt">
              <Check className="size-3.5" /> Saved
            </span>
          ) : null}
          <Button type="button" onClick={onSave} disabled={pending || theme === (user.editorTheme ?? DEFAULT_EDITOR_THEME)}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
