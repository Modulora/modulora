/**
 * Save menu (Plus): bookmark a component or add it to a list. Non-Plus
 * accounts see an honest upsell — the features aren't hidden, they're
 * labeled. Saving never affects earnings or rank.
 */
import { useEffect, useState } from "react";
import { Bookmark, Check, ListPlus, Loader2, Plus, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { createList, fetchMyLists, toggleListItem, type MyList } from "@/lib/lists";

export function SaveMenu({ namespace, name, plus }: { namespace: string; name: string; plus: boolean }) {
  const [saved, setSaved] = useState(false);
  const [lists, setLists] = useState<MyList[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!plus || loaded) return;
    const [bookmarked, mine] = await Promise.all([
      isBookmarked({ data: { namespace, name } }),
      fetchMyLists(),
    ]);
    setSaved(bookmarked);
    setLists(mine.lists);
    setLoaded(true);
  }

  const inList = (list: MyList) => list.items.some((item) => item.namespace === namespace && item.name === name);

  return (
    <DropdownMenu onOpenChange={(open) => open && void load()}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Save"
          className="flex size-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <Bookmark className={`size-4 ${saved ? "fill-current text-foreground" : ""}`} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {!plus ? (
          <div className="px-2 py-2.5">
            <p className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="size-3.5" /> Modulora Plus</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Bookmarks and lists are part of Plus. Saving never affects a component&apos;s rank or earnings.
            </p>
            <a href="/pricing" className="mt-2 inline-block text-xs font-medium text-foreground underline underline-offset-2">See pricing →</a>
          </div>
        ) : (
          <>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setSaved(!saved);
                void toggleBookmark({ data: { namespace, name } }).then((res) => {
                  if (!res.ok) setSaved(saved);
                });
              }}
            >
              <Bookmark className={`size-4 ${saved ? "fill-current" : ""}`} />
              {saved ? "Bookmarked" : "Bookmark"}
              {saved ? <Check className="ml-auto size-3.5" /> : null}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Add to list</DropdownMenuLabel>
            {!loaded ? (
              <div className="flex justify-center py-2"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
            ) : (
              lists.map((list) => (
                <DropdownMenuItem
                  key={list.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    void toggleListItem({ data: { listId: list.id, namespace, name } }).then(() => fetchMyLists().then((r) => setLists(r.lists)));
                  }}
                >
                  <ListPlus className="size-4" />
                  <span className="flex-1 truncate">{list.title}</span>
                  {inList(list) ? <Check className="size-3.5" /> : null}
                  <span className="text-[10px] uppercase text-muted-foreground/60">{list.visibility === "public" ? "pub" : ""}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuItem
              disabled={busy}
              onSelect={(e) => {
                e.preventDefault();
                const title = window.prompt("List title:");
                if (!title) return;
                const visibility = window.confirm("Make this list public? (OK = public, Cancel = private)") ? "public" : "private";
                setBusy(true);
                void createList({ data: { title, visibility } }).then(() => fetchMyLists().then((r) => { setLists(r.lists); setBusy(false); }));
              }}
            >
              <Plus className="size-4" /> New list…
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
