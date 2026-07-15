import { useMemo, useState, type FormEvent } from "react";
import { HiArrowPath as Loader, HiPhoto as Photo, HiSparkles as Sparkles, HiXMark as X } from "react-icons/hi2";

import { ProfileThemeBoundary } from "@/components/profile-theme-boundary";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PROFILE_FONTS,
  parseTweakcnTheme,
  type ProfileBackgroundOverlay,
  type ProfileFontId,
  type ProfileThemeVariables,
} from "@/lib/profile-theme";

export interface ProfileCustomizationEditorProps {
  isPlus: boolean;
  initialFont: ProfileFontId;
  initialThemeCss: string;
  initialLightTheme: ProfileThemeVariables;
  initialDarkTheme: ProfileThemeVariables;
  initialBackgroundImage: string | null;
  initialBackgroundOverlay: ProfileBackgroundOverlay;
  initialBackgroundOverlayOpacity: number;
  initialBackgroundPositionX: number;
  initialBackgroundPositionY: number;
  onSave: (input: { font: ProfileFontId; themeCss: string; backgroundImage: string | null; backgroundOverlay: ProfileBackgroundOverlay; backgroundOverlayOpacity: number; backgroundPositionX: number; backgroundPositionY: number }) => Promise<{ ok: boolean; error?: string; ignored?: string[] }>;
}

interface BackgroundEditorSnapshot {
  image: string | null;
  overlay: ProfileBackgroundOverlay;
  opacity: number;
  positionX: number;
  positionY: number;
}

export function ProfileCustomizationEditor({
  isPlus,
  initialFont,
  initialThemeCss,
  initialLightTheme,
  initialDarkTheme,
  initialBackgroundImage,
  initialBackgroundOverlay,
  initialBackgroundOverlayOpacity,
  initialBackgroundPositionX,
  initialBackgroundPositionY,
  onSave,
}: ProfileCustomizationEditorProps) {
  const [font, setFont] = useState<ProfileFontId>(initialFont);
  const [themeCss, setThemeCss] = useState(initialThemeCss);
  const [backgroundImage, setBackgroundImage] = useState(initialBackgroundImage);
  const [backgroundOverlay, setBackgroundOverlay] = useState<ProfileBackgroundOverlay>(initialBackgroundOverlay);
  const [backgroundOverlayOpacity, setBackgroundOverlayOpacity] = useState(initialBackgroundOverlayOpacity);
  const [backgroundPositionX, setBackgroundPositionX] = useState(initialBackgroundPositionX);
  const [backgroundPositionY, setBackgroundPositionY] = useState(initialBackgroundPositionY);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [backgroundEditorOpen, setBackgroundEditorOpen] = useState(false);
  const [backgroundEditorSnapshot, setBackgroundEditorSnapshot] = useState<BackgroundEditorSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const parsed = useMemo(() => parseTweakcnTheme(themeCss), [themeCss]);
  const previewLight = parsed.ok ? parsed.theme.light : initialLightTheme;
  const previewDark = parsed.ok ? parsed.theme.dark : initialDarkTheme;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isPlus || !parsed.ok) {
      if (!parsed.ok) setError(parsed.error);
      return;
    }
    setPending(true);
    setError(null);
    setNotice(null);
    const result = await onSave({ font, themeCss, backgroundImage, backgroundOverlay, backgroundOverlayOpacity, backgroundPositionX, backgroundPositionY });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save profile customization.");
      return;
    }
    setNotice(result.ignored?.length ? `Saved. Ignored unsupported variables: ${result.ignored.join(", ")}.` : "Saved to your public profile.");
  }

  function resetCustomization() {
    setFont("inter");
    setThemeCss("");
    setBackgroundImage(null);
    setBackgroundOverlay("dark");
    setBackgroundOverlayOpacity(35);
    setBackgroundPositionX(50);
    setBackgroundPositionY(50);
    setBackgroundEditorOpen(false);
    setBackgroundEditorSnapshot(null);
    setError(null);
    setNotice("Defaults ready. Save to apply them to your public profile.");
  }

  async function uploadBackground(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError("Background image must be under 2 MB.");
      return;
    }
    const previous = backgroundState();
    setUploading(true);
    setError(null);
    setNotice(null);
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch("/api/upload-profile-background", { method: "POST", body: form });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setError(result.error ?? "Could not upload the background image.");
        return;
      }
      setBackgroundImage(result.url);
      setBackgroundPositionX(50);
      setBackgroundPositionY(50);
      setBackgroundEditorSnapshot(previous);
      setBackgroundEditorOpen(true);
      setNotice("Background uploaded. Frame it, then save your profile style.");
    } catch {
      setError("Could not upload the background image.");
    } finally {
      setUploading(false);
    }
  }

  function backgroundState(): BackgroundEditorSnapshot {
    return {
      image: backgroundImage,
      overlay: backgroundOverlay,
      opacity: backgroundOverlayOpacity,
      positionX: backgroundPositionX,
      positionY: backgroundPositionY,
    };
  }

  function openBackgroundEditor() {
    setBackgroundEditorSnapshot(backgroundState());
    setBackgroundEditorOpen(true);
  }

  function cancelBackgroundEditor() {
    if (backgroundEditorSnapshot) {
      setBackgroundImage(backgroundEditorSnapshot.image);
      setBackgroundOverlay(backgroundEditorSnapshot.overlay);
      setBackgroundOverlayOpacity(backgroundEditorSnapshot.opacity);
      setBackgroundPositionX(backgroundEditorSnapshot.positionX);
      setBackgroundPositionY(backgroundEditorSnapshot.positionY);
    }
    setBackgroundEditorSnapshot(null);
    setBackgroundEditorOpen(false);
  }

  function applyBackgroundEditor() {
    setBackgroundEditorSnapshot(null);
    setBackgroundEditorOpen(false);
    setNotice("Background framing ready. Save style to publish it.");
  }

  function setFocalPoint(element: HTMLElement, clientX: number, clientY: number) {
    const bounds = element.getBoundingClientRect();
    setBackgroundPositionX(Math.round(Math.max(0, Math.min(100, ((clientX - bounds.left) / bounds.width) * 100)) / 5) * 5);
    setBackgroundPositionY(Math.round(Math.max(0, Math.min(100, ((clientY - bounds.top) / bounds.height) * 100)) / 5) * 5);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-xl border border-border/60 bg-card/40 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            Public profile style <Sparkles className="size-3.5" aria-hidden="true" />
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Plus customization affects your public profile only. Published styling remains if Plus lapses.
          </p>
        </div>
        <span className="rounded-full border border-ticket/30 bg-ticket/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ticket">
          Plus
        </span>
      </div>

      {!isPlus ? (
        <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground">
          Your published font and theme remain active. Resume Plus to edit them.
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-font">Google Font</Label>
            <Select value={font} onValueChange={(value) => { setFont(value as ProfileFontId); setNotice(null); }} disabled={!isPlus || pending}>
              <SelectTrigger id="profile-font" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROFILE_FONTS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Curated fonts load only on your public profile. Geist Pixel is self-hosted by Modulora.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-background-image">Background image</Label>
            <div className="overflow-hidden rounded-xl border border-border bg-secondary/20">
              {backgroundImage ? (
                <img src={backgroundImage} alt="Background preview" className="h-36 w-full object-cover" style={{ objectPosition: `${backgroundPositionX}% ${backgroundPositionY}%` }} />
              ) : (
                <div className="flex h-28 items-center justify-center text-muted-foreground">
                  <Photo className="size-6" aria-hidden="true" />
                </div>
              )}
              <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-background/85 p-2 backdrop-blur-sm">
                <label htmlFor="profile-background-image" className="inline-flex min-h-9 cursor-pointer items-center rounded-md px-3 text-xs font-medium transition-colors hover:bg-secondary focus-within:ring-2 focus-within:ring-ring/50">
                  {uploading ? <Loader className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <Photo className="mr-2 size-4" aria-hidden="true" />}
                  {backgroundImage ? "Replace" : "Upload image"}
                  <input
                    id="profile-background-image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={!isPlus || pending || uploading}
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) void uploadBackground(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {backgroundImage ? (
                  <div className="flex items-center gap-1">
                    <Button type="button" size="sm" variant="ghost" disabled={!isPlus || pending || uploading} onClick={openBackgroundEditor}>Edit framing</Button>
                    <Button type="button" size="sm" variant="ghost" disabled={!isPlus || pending || uploading} onClick={() => { setBackgroundImage(null); setNotice("Background removed. Save to apply."); }}>
                      <X className="size-4" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP up to 2 MB. Stored by Modulora and displayed beneath your profile content.</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-end justify-between gap-3">
              <Label htmlFor="profile-theme-css">tweakcn theme CSS</Label>
              <button
                type="button"
                disabled={!isPlus || pending || !themeCss}
                onClick={() => { setThemeCss(""); setError(null); setNotice(null); }}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40"
              >
                Use default theme
              </button>
            </div>
            <textarea
              id="profile-theme-css"
              value={themeCss}
              onChange={(event) => { setThemeCss(event.target.value); setError(null); setNotice(null); }}
              disabled={!isPlus || pending}
              rows={13}
              maxLength={16_000}
              spellCheck={false}
              placeholder={":root {\n  --background: oklch(...);\n  --foreground: oklch(...);\n}\n\n.dark { ... }"}
              aria-invalid={Boolean(error) || !parsed.ok}
              aria-describedby="profile-theme-help profile-theme-status"
              className="min-h-72 w-full resize-y rounded-lg border border-input bg-background/40 px-3 py-3 font-mono text-xs leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
            />
            <p id="profile-theme-help" className="text-xs leading-relaxed text-muted-foreground">
              Paste tweakcn’s full CSS export. Profile colors and radius are sanitized and scoped; core text requires 4.5:1 contrast and supporting tokens require 3:1.
            </p>
          </div>
        </div>

        <ProfileThemeBoundary font={font} lightTheme={previewLight} darkTheme={previewDark} backgroundImage={backgroundImage} backgroundOverlay={backgroundOverlay} backgroundOverlayOpacity={backgroundOverlayOpacity} backgroundPositionX={backgroundPositionX} backgroundPositionY={backgroundPositionY} className="min-h-0 rounded-xl">
          <div className="min-h-72 rounded-xl border border-border bg-background p-4 text-foreground">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
            <div className="mt-4 rounded-xl border border-border bg-card p-4 text-card-foreground">
              <p className="font-semibold">Your public profile</p>
              <p className="mt-1 text-sm text-muted-foreground">Typography and sanitized theme tokens preview here.</p>
              <Button type="button" size="sm" className="mt-4">Profile action</Button>
            </div>
          </div>
        </ProfileThemeBoundary>
      </div>

      <Dialog open={backgroundEditorOpen} onOpenChange={(open) => { if (!open) cancelBackgroundEditor(); }}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Frame profile background</DialogTitle>
            <DialogDescription>Click or drag the focal point while previewing the image behind a public profile.</DialogDescription>
          </DialogHeader>

          {backgroundImage ? (
            <div className="flex flex-col gap-4">
              <div
                role="application"
                tabIndex={0}
                aria-label={`Profile background focal point: ${backgroundPositionX}% horizontal, ${backgroundPositionY}% vertical. Click, drag, or use arrow keys to adjust.`}
                className="relative h-[min(52svh,32rem)] cursor-crosshair overflow-hidden rounded-xl border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setFocalPoint(event.currentTarget, event.clientX, event.clientY);
                }}
                onPointerMove={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) setFocalPoint(event.currentTarget, event.clientX, event.clientY);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") setBackgroundPositionX((value) => Math.max(0, value - 5));
                  else if (event.key === "ArrowRight") setBackgroundPositionX((value) => Math.min(100, value + 5));
                  else if (event.key === "ArrowUp") setBackgroundPositionY((value) => Math.max(0, value - 5));
                  else if (event.key === "ArrowDown") setBackgroundPositionY((value) => Math.min(100, value + 5));
                  else return;
                  event.preventDefault();
                }}
              >
                <ProfileThemeBoundary
                  font={font}
                  lightTheme={previewLight}
                  darkTheme={previewDark}
                  backgroundImage={backgroundImage}
                  backgroundOverlay={backgroundOverlay}
                  backgroundOverlayOpacity={backgroundOverlayOpacity}
                  backgroundPositionX={backgroundPositionX}
                  backgroundPositionY={backgroundPositionY}
                  className="min-h-0 size-full"
                >
                  <div className="pointer-events-none mx-auto flex h-full max-w-4xl flex-col justify-center gap-5 p-6 sm:p-10">
                    <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-secondary text-xl font-bold">M</div>
                        <div>
                          <p className="text-xl font-bold">Your public profile</p>
                          <p className="text-sm text-muted-foreground">@creator · Components, collections, and links</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {["Components", "Collections", "Public lists"].map((label) => (
                        <div key={label} className="h-24 rounded-xl border border-border/70 bg-card/75 p-4 shadow-sm backdrop-blur-sm">
                          <p className="text-sm font-semibold">{label}</p>
                          <div className="mt-3 h-2 w-2/3 rounded-full bg-muted" />
                        </div>
                      ))}
                    </div>
                  </div>
                </ProfileThemeBoundary>
                <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/75 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">Drag focal point</span>
                <span aria-hidden="true" className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/35 shadow-[0_0_0_1px_rgba(0,0,0,0.65)]" style={{ left: `${backgroundPositionX}%`, top: `${backgroundPositionY}%` }} />
              </div>

              <div className="grid gap-4 rounded-xl border border-border/60 bg-secondary/20 p-4 sm:grid-cols-[10rem_1fr_1fr]">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile-background-overlay">Overlay</Label>
                  <Select value={backgroundOverlay} onValueChange={(value) => setBackgroundOverlay(value as ProfileBackgroundOverlay)}>
                    <SelectTrigger id="profile-background-overlay"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="dark">Darken</SelectItem><SelectItem value="light">Lighten</SelectItem></SelectContent>
                  </Select>
                </div>
                <RangeControl id="profile-background-overlay-strength" label="Overlay strength" value={backgroundOverlayOpacity} max={80} onChange={setBackgroundOverlayOpacity} />
                <div className="grid grid-cols-2 gap-3">
                  <RangeControl id="profile-background-position-x" label="Horizontal" value={backgroundPositionX} max={100} onChange={setBackgroundPositionX} />
                  <RangeControl id="profile-background-position-y" label="Vertical" value={backgroundPositionY} max={100} onChange={setBackgroundPositionY} />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelBackgroundEditor}>Cancel</Button>
            <Button type="button" onClick={applyBackgroundEditor}>Apply framing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex min-h-9 items-center justify-between gap-4">
        <p id="profile-theme-status" className={`text-xs ${error || !parsed.ok ? "text-destructive" : "text-muted-foreground"}`} role={error ? "alert" : "status"}>
          {error ?? (!parsed.ok ? parsed.error : notice ?? "")}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!isPlus || pending || uploading || (font === "inter" && !themeCss && !backgroundImage && backgroundOverlay === "dark" && backgroundOverlayOpacity === 35 && backgroundPositionX === 50 && backgroundPositionY === 50)}
            onClick={resetCustomization}
          >
            Reset
          </Button>
          <Button type="submit" disabled={!isPlus || pending || uploading || !parsed.ok} className="min-w-28">
            {pending ? <Loader className="size-4 animate-spin" aria-hidden="true" /> : null}
            Save style
          </Button>
        </div>
      </div>
    </form>
  );
}

function RangeControl({ id, label, value, max, onChange }: { id: string; label: string; value: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <output htmlFor={id} className="text-xs tabular-nums text-muted-foreground">{value}%</output>
      </div>
      <input id={id} type="range" min="0" max={max} step="5" value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-9 w-full accent-primary" />
    </div>
  );
}
