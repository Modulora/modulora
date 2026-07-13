/** Lists (Plus) — named public/private groups of anyone's components. */
import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Globe, ListPlus, Loader2, Lock, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createList, deleteList, fetchMyLists } from "@/lib/lists";
import { fetchMyBookmarks } from "@/lib/bookmarks";

export const Route = createFileRoute("/dashboard/lists")({
  loader: async () => ({ mine: await fetchMyLists(), bookmarks: await fetchMyBookmarks() }),
  component: ListsPage,
});

function ListsPage() {
  const { mine, bookmarks } = Route.useLoaderData();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mine.plus) {
    return (
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold">Lists</h1>
        <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 px-6 py-12 text-center">
          <Sparkles className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Part of Modulora Plus</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Bookmarks and public/private component lists are Plus features. Saving never affects a component&apos;s rank or earnings.
          </p>
          <Link to="/pricing" className="mt-1 text-xs font-medium text-foreground underline underline-offset-2">See pricing →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <h1 className="text-2xl font-semibold">Lists</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Group anyone&apos;s components. Public lists show on your profile as &quot;curated by you&quot;; private ones are yours alone.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-border/60 bg-card/35 p-4">
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label className="text-xs text-muted-foreground">New list</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Favorite date pickers" className="h-9" />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setVisibility(visibility === "public" ? "private" : "public")}
        >
          {visibility === "public" ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
          {visibility === "public" ? "Public" : "Private"}
        </Button>
        <Button
          size="sm"
          disabled={busy || !title.trim()}
          className="gap-1.5"
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await createList({ data: { title, visibility } });
            setBusy(false);
            if (!res.ok) { setError(res.error ?? "Could not create."); return; }
            setTitle("");
            await router.invalidate();
          }}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Create
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      <div className="mt-6 flex flex-col gap-3">
        {bookmarks.length > 0 ? (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Bookmarks</p>
              <Link to="/dashboard/bookmarks" className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">View all</Link>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{bookmarks.length} saved · always private</p>
          </div>
        ) : null}
        {mine.lists.map((list) => (
          <div key={list.id} className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-medium">{list.title}</p>
                <span className="flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {list.visibility === "public" ? <Globe className="size-2.5" /> : <Lock className="size-2.5" />}
                  {list.visibility}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await deleteList({ data: { listId: list.id } });
                  await router.invalidate();
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            {list.items.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Empty — add components from their pages.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {list.items.map((item) => (
                  <Link
                    key={`${item.namespace}/${item.name}`}
                    to="/components/$namespace/$name"
                    params={{ namespace: item.namespace, name: item.name }}
                    className="rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {mine.lists.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 px-6 py-10 text-center">
            <ListPlus className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No lists yet — create one above, then add components from their pages.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
