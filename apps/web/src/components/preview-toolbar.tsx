/**
 * Shared preview chrome: viewport (mobile/tablet/desktop), light/dark, reset,
 * fullscreen. Used by the component detail workbench and the authoring editor
 * so both previews feel identical.
 */
import type { ReactNode } from "react";
import { HiArrowsPointingOut as Maximize2, HiComputerDesktop as Monitor, HiMoon as Moon, HiArrowUturnLeft as RotateCcw, HiDevicePhoneMobile as Smartphone, HiSun as Sun, HiDeviceTablet as Tablet } from "react-icons/hi2";


export type PreviewViewport = "mobile" | "tablet" | "desktop";

export function PreviewToolbar({
  theme,
  onTheme,
  viewport,
  onViewport,
  onRefresh,
  onFullscreen,
}: {
  theme: "light" | "dark";
  onTheme: (theme: "light" | "dark") => void;
  viewport: PreviewViewport;
  onViewport: (viewport: PreviewViewport) => void;
  onRefresh: () => void;
  onFullscreen: () => void;
}) {
  return (
    <div className="flex min-w-max items-center gap-1">
      <ToolbarGroup>
        <ToolbarButton label="Mobile preview" active={viewport === "mobile"} onClick={() => onViewport("mobile")}><Smartphone /></ToolbarButton>
        <ToolbarButton label="Tablet preview" active={viewport === "tablet"} onClick={() => onViewport("tablet")}><Tablet /></ToolbarButton>
        <ToolbarButton label="Desktop preview" active={viewport === "desktop"} onClick={() => onViewport("desktop")}><Monitor /></ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup>
        <ToolbarButton label="Light preview" active={theme === "light"} onClick={() => onTheme("light")}><Sun /></ToolbarButton>
        <ToolbarButton label="Dark preview" active={theme === "dark"} onClick={() => onTheme("dark")}><Moon /></ToolbarButton>
      </ToolbarGroup>
      <ToolbarButton label="Reset preview" onClick={onRefresh}><RotateCcw /></ToolbarButton>
      <ToolbarButton label="Fullscreen preview" onClick={onFullscreen}><Maximize2 /></ToolbarButton>
    </div>
  );
}

export function ToolbarGroup({ children }: { children: ReactNode }) {
  return <div className="mr-1 flex shrink-0 rounded-md border border-border/60 p-0.5">{children}</div>;
}

export function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex size-11 shrink-0 items-center justify-center rounded transition-[background-color,color,transform] [transition-duration:var(--motion-control-duration)] [transition-timing-function:var(--ease-out-exact)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:size-7 [&_svg]:size-3.5 ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}
