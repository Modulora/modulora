/** Bookmarks — components you saved. Personal only; never affects rank. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { fetchMyBookmarks } from "@/lib/bookmarks";
import { fetchCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/dashboard/bookmarks")({
  loader: async () => ({ bookmarks: await fetchMyBookmarks(), plus: (await fetchCurrentUser())?.isPlus ?? false }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { bookmarks, plus } = Route.useLoaderData();
  if (!plus) {
    return (
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold">Bookmarks</h1>
        <p className="mt-8 rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">Bookmarks are part of Modulora Plus.</p>
      </div>
    );
  }
  return (
    <div className="w-full max-w-3xl">
      <h1 className="text-2xl font-semibold">Bookmarks</h1>
      <p className="mt-1 text-sm text-muted-foreground">Components you saved. Only you can see these.</p>
      <div className="mt-8 flex flex-col gap-3">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 px-6 py-12 text-center">
            <Bookmark className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Nothing saved yet</p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              Hit the bookmark on any component page and it lands here.
            </p>
          </div>
        ) : (
          bookmarks.map((bookmark) => (
            <Link
              key={`${bookmark.namespace}/${bookmark.name}`}
              to="/components/$namespace/$name"
              params={{ namespace: bookmark.namespace, name: bookmark.name }}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-foreground/20"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{bookmark.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  @{bookmark.namespace}/{bookmark.name}
                  {bookmark.description ? ` · ${bookmark.description}` : ""}
                </p>
              </div>
              <Bookmark className="size-4 shrink-0 fill-current text-foreground/70" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
