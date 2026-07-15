import { useEffect, useState } from "react";
import { HiArrowTopRightOnSquare as External, HiGlobeAlt as Globe, HiPhoto as ImageIcon } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ExternalSitePreview({
  url,
  title,
  imageUrl,
  imageAlt = "",
  className,
}: {
  url: string;
  title: string;
  imageUrl?: string | null;
  imageAlt?: string;
  className?: string;
}) {
  const [mode, setMode] = useState<"live" | "image">("live");
  const [sandbox, setSandbox] = useState<string | null>(null);

  useEffect(() => {
    try {
      const crossOrigin = new URL(url).origin !== window.location.origin;
      // Cross-origin sites may use their own storage and runtime while the
      // browser's same-origin policy still prevents access to Modulora.
      setSandbox(crossOrigin ? "allow-scripts allow-same-origin" : "allow-scripts");
    } catch {
      setSandbox("allow-scripts");
    }
  }, [url]);

  return (
    <div className={cn("relative overflow-hidden bg-secondary/20", className)}>
      {mode === "live" ? (
        sandbox ? (
          <iframe
            src={url}
            title={title}
            sandbox={sandbox}
            referrerPolicy="no-referrer"
            className="size-full bg-white"
          />
        ) : (
          <div className="size-full bg-secondary/20" aria-hidden />
        )
      ) : imageUrl ? (
        <img src={imageUrl} alt={imageAlt} referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
          <ImageIcon className="size-6" />
          <p className="text-xs">No Open Graph image was provided by this site.</p>
        </div>
      )}

      <div role="group" aria-label="Preview mode" className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-white/15 bg-background/90 p-1 shadow-sm backdrop-blur-sm">
        <Button type="button" size="sm" variant={mode === "live" ? "secondary" : "ghost"} aria-pressed={mode === "live"} className="h-7 gap-1.5 px-2 text-xs" onClick={() => setMode("live")}><Globe className="size-3.5" />Live site</Button>
        <Button type="button" size="sm" variant={mode === "image" ? "secondary" : "ghost"} aria-pressed={mode === "image"} disabled={!imageUrl} className="h-7 gap-1.5 px-2 text-xs" onClick={() => setMode("image")}><ImageIcon className="size-3.5" />Image</Button>
      </div>

      <Button asChild size="icon-sm" variant="secondary" className="absolute right-3 top-3 z-10 shadow-sm">
        <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${title} in a new tab`}><External /></a>
      </Button>

      <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-background/90 px-2 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
        {mode === "live" ? "Cross-origin sandbox · forms and popups disabled" : "Open Graph image fallback"}
      </span>
    </div>
  );
}
