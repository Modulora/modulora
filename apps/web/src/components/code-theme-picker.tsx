/* ─────────────────────────────────────────────────────────
 * CODE THEME PICKER
 *
 * A popover that previews every Shiki theme with its *exact* colors (from
 * theme-palettes.generated.ts). Each row renders a mini code snippet in the
 * theme's own background + token colors, so you pick by sight, not by name.
 * ───────────────────────────────────────────────────────── */
import { useMemo, useState } from "react";
import { Popover } from "radix-ui";
import { motion } from "motion/react";
import { HiCheck as Check, HiChevronUpDown as ChevronsUpDown, HiMagnifyingGlass as Search } from "react-icons/hi2";


import { THEME_PALETTES, type ThemePalette } from "@/lib/theme-palettes.generated";

const SPRING = { type: "spring" as const, stiffness: 420, damping: 32 };

/** Two lines of representative tokens painted with a theme's exact colors. */
function ThemePreview({ palette, className }: { palette: ThemePalette; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-md font-mono text-[11px] leading-[1.5] ${className ?? ""}`}
      style={{ backgroundColor: palette.bg, color: palette.fg }}
    >
      <div className="px-2.5 py-2">
        <div style={{ color: palette.comment }}>// {palette.name}</div>
        <div>
          <span style={{ color: palette.keyword }}>const</span>{" "}
          <span style={{ color: palette.variable }}>total</span> ={" "}
          <span style={{ color: palette.func }}>sum</span>(
          <span style={{ color: palette.number }}>1</span>,{" "}
          <span style={{ color: palette.number }}>2</span>)
        </div>
        <div>
          <span style={{ color: palette.keyword }}>return</span>{" "}
          <span style={{ color: palette.string }}>&quot;ok&quot;</span>
        </div>
      </div>
    </div>
  );
}

export function CodeThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => THEME_PALETTES.find((p) => p.id === value) ?? THEME_PALETTES[0]!,
    [value],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? THEME_PALETTES.filter((p) => p.name.toLowerCase().includes(q)) : THEME_PALETTES;
    // Dark first, then light, each alphabetical — matches how people browse.
    return [...list].sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dark" ? -1 : 1,
    );
  }, [query]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 rounded-md border border-input bg-transparent p-1.5 pr-3 text-left outline-none transition-colors hover:border-ring/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ThemePreview palette={selected} className="w-40 shrink-0 border border-border/40" />
          <span className="flex-1 truncate text-sm">{selected.name}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-80 rounded-xl border border-border/60 bg-popover p-2 shadow-xl outline-none"
          asChild
        >
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={SPRING}
          >
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${THEME_PALETTES.length} themes…`}
                className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-2 text-sm outline-none focus-visible:border-ring"
              />
            </div>

            <div className="grid max-h-[22rem] gap-1 overflow-y-auto pr-0.5 sm:grid-cols-2">
              {results.map((palette) => {
                const active = palette.id === value;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => {
                      onChange(palette.id);
                      setOpen(false);
                    }}
                    className={`group relative rounded-lg border p-1.5 text-left transition-colors ${
                      active ? "border-foreground/40 bg-accent/50" : "border-transparent hover:bg-accent/40"
                    }`}
                  >
                    <ThemePreview palette={palette} className="border border-border/30" />
                    <div className="mt-1 flex items-center gap-1.5 px-0.5">
                      <span className="flex-1 truncate text-xs">{palette.name}</span>
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">
                        {palette.type}
                      </span>
                      {active ? <Check className="size-3 text-foreground" /> : null}
                    </div>
                  </button>
                );
              })}
              {results.length === 0 ? (
                <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                  No themes match “{query}”.
                </p>
              ) : null}
            </div>
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
