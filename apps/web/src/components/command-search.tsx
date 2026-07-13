/**
 * Global shortcuts + ⌘K search. D toggles the theme (never while typing);
 * ⌘K / Ctrl+K opens a search dialog over /api/search with keyboard
 * navigation. Mounted once in the app shell.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PriceSeal } from "@/components/money";

interface SearchResult {
  ref: string;
  title: string;
  description: string;
  category: string;
  paid: boolean;
  price: number | null;
}

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

export function CommandSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<number | null>(null);

  // Global shortcuts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (event.key.toLowerCase() === "d" && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditable(event.target)) {
        void import("@/lib/theme").then((m) => m.toggleTheme());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const search = useCallback((q: string) => {
    setQuery(q);
    setSelected(0);
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, { headers: { accept: "application/json" } });
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 180);
  }, []);

  // Preload initial results when opening.
  useEffect(() => {
    if (open) search("");
    else {
      setQuery("");
      setResults([]);
    }
  }, [open, search]);

  function go(result: SearchResult) {
    const [namespace, name] = result.ref.replace(/^@/, "").split("/");
    setOpen(false);
    navigate({ to: "/components/$namespace/$name", params: { namespace: namespace!, name: name! } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[20%] max-w-lg translate-y-0 gap-0 p-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Search components</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-border/60 px-4">
          {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <Search className="size-4 text-muted-foreground" />}
          <input
            autoFocus
            value={query}
            onChange={(event) => search(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((s) => Math.min(results.length - 1, s + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((s) => Math.max(0, s - 1));
              } else if (event.key === "Enter" && results[selected]) {
                go(results[selected]);
              }
            }}
            placeholder="Search components…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {loading ? "Searching…" : query ? "No components matched." : "Type to search the catalog."}
            </p>
          ) : (
            results.map((result, index) => (
              <button
                key={result.ref}
                type="button"
                onClick={() => go(result)}
                onPointerMove={() => setSelected(index)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${index === selected ? "bg-accent" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{result.title}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{result.ref} · {result.category}</p>
                </div>
                <PriceSeal paid={result.paid} label={result.price != null ? `$${(result.price / 100).toFixed(0)}` : undefined} />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
