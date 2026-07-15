import { useId, type ReactNode } from "react";

import {
  profileFont,
  profileThemeDeclarations,
  type ProfileBackgroundOverlay,
  type ProfileFontId,
  type ProfileThemeVariables,
} from "@/lib/profile-theme";
import { cn } from "@/lib/utils";

export interface ProfileThemeBoundaryProps {
  font: ProfileFontId;
  lightTheme: ProfileThemeVariables;
  darkTheme: ProfileThemeVariables;
  backgroundImage?: string | null;
  backgroundOverlay?: ProfileBackgroundOverlay;
  backgroundOverlayOpacity?: number;
  backgroundPositionX?: number;
  backgroundPositionY?: number;
  children: ReactNode;
  className?: string;
}

export function ProfileThemeBoundary({ font, lightTheme, darkTheme, backgroundImage, backgroundOverlay = "dark", backgroundOverlayOpacity = 35, backgroundPositionX = 50, backgroundPositionY = 50, children, className }: ProfileThemeBoundaryProps) {
  const scope = `profile-theme-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const selectedFont = profileFont(font);
  const light = profileThemeDeclarations(lightTheme);
  const dark = profileThemeDeclarations(darkTheme);
  const css = light || dark
    ? `.${scope}{${light}}.dark .${scope}{${dark || light}}`
    : "";
  const googleUrl = selectedFont.googleFamily
    ? `https://fonts.googleapis.com/css2?family=${selectedFont.googleFamily}:wght@400;500;600;700&display=swap`
    : null;
  const localFontCss = selectedFont.localFile
    ? `@font-face{font-family:${selectedFont.family.split(",")[0]};src:url("${selectedFont.localFile}") format("woff2");font-display:swap;font-style:normal;font-weight:${selectedFont.weight};}`
    : "";

  return (
    <div
      data-slot="profile-theme-boundary"
      className={cn(scope, "relative isolate min-h-[calc(100svh-3.5rem)] overflow-hidden bg-background text-foreground", className)}
      style={{ fontFamily: selectedFont.family }}
    >
      {googleUrl ? <link rel="stylesheet" href={googleUrl} /> : null}
      {localFontCss ? <style>{localFontCss}</style> : null}
      {css ? <style>{css}</style> : null}
      {backgroundImage ? (
        <>
          <img
            src={backgroundImage}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 size-full object-cover"
            style={{ objectPosition: `${backgroundPositionX}% ${backgroundPositionY}%` }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{ backgroundColor: backgroundOverlay === "light" ? "white" : "black", opacity: backgroundOverlayOpacity / 100 }}
          />
        </>
      ) : null}
      {css || backgroundImage ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.5)_8%,transparent_24%,transparent_76%,rgba(255,255,255,0.5)_92%,rgba(255,255,255,0.95)_100%)] dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.5)_8%,transparent_24%,transparent_76%,rgba(0,0,0,0.5)_92%,rgba(0,0,0,0.95)_100%)]"
        />
      ) : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
