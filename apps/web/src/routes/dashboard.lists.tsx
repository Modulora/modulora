/** Lists (Plus) — named public/private groups of anyone's components. */
import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  HiArrowTopRightOnSquare as ExternalLink,
  HiBookmark as Bookmark,
  HiCheck as Check,
  HiGlobeAlt as Globe,
  HiLink as LinkIcon,
  HiLockClosed as Lock,
  HiMagnifyingGlass as Search,
  HiPlus as Plus,
  HiQueueList as ListIcon,
  HiSparkles as Sparkles,
  HiTrash as Trash2,
} from "react-icons/hi2";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { NewListDialog } from "@/components/new-list-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchMyBookmarks } from "@/lib/bookmarks";
import { createList, deleteList, fetchMyLists, setListVisibility, type MyList } from "@/lib/lists";

export const Route = createFileRoute("/dashboard/lists")({
  loader: async () => ({ mine: await fetchMyLists(), bookmarks: await fetchMyBookmarks() }),
  component: ListsPage,
});

function ListsPage() {
  const { mine, bookmarks } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const username = user?.username ?? null;
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [workingListId, setWorkingListId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const publicCount = mine.lists.filter((list) => list.visibility === "public").length;
    return {
      lists: mine.lists.length,
      public: publicCount,
      private: mine.lists.length - publicCount,
      components: mine.lists.reduce((total, list) => total + list.items.length, 0),
    };
  }, [mine.lists]);

  const filteredLists = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return mine.lists.filter((list) => {
      if (visibilityFilter !== "all" && list.visibility !== visibilityFilter) return false;
      if (!normalizedQuery) return true;
      return list.title.toLowerCase().includes(normalizedQuery)
        || list.items.some((item) => item.title.toLowerCase().includes(normalizedQuery) || `${item.namespace}/${item.name}`.includes(normalizedQuery));
    });
  }, [mine.lists, query, visibilityFilter]);
  const showBookmarks = bookmarks.length > 0
    && visibilityFilter !== "public"
    && (!query.trim() || "bookmarks saved components".includes(query.trim().toLowerCase()));

  if (!mine.plus && mine.lists.length === 0) {
    return (
      <div className="w-full">
        <DashboardPageHeader title="Lists" />
        <EmptyState
          icon={Sparkles}
          title="Part of Modulora Plus"
          description={<>Bookmarks and public/private component lists are Plus features. Saving never affects a component&apos;s rank or earnings.</>}
          action={<Button asChild size="sm"><Link to="/pricing">See Plus</Link></Button>}
          className="mt-8 min-h-72"
        />
      </div>
    );
  }

  const invalidate = async () => router.invalidate();

  return (
    <div className="w-full">
      <DashboardPageHeader
        title="Lists"
        description={mine.plus ? <>Curate components into public lists for your profile or private lists just for you.</> : <>Your lists remain visible after Plus lapses. Existing public lists stay published until you make them private or delete them.</>}
        action={mine.plus ? <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}><Plus className="size-3.5" />New list</Button> : undefined}
      />

      {!mine.plus ? (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border/60 bg-secondary/25 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Lists are read-only while Plus is inactive</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">You can make a public list private or delete any list. Resume Plus to create lists, add components, or publish a private list.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0"><Link to="/pricing">See Plus</Link></Button>
        </div>
      ) : null}

      <section aria-label="List summary" className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-border/60 bg-card/35 lg:grid-cols-4">
        <ListStat label="Lists" value={stats.lists} className="border-b border-r lg:border-b-0" />
        <ListStat label="Public" value={stats.public} className="border-b lg:border-b-0 lg:border-r" />
        <ListStat label="Private" value={stats.private} className="border-r" />
        <ListStat label="List entries" value={stats.components} />
      </section>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border/60 bg-card/30 p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lists and components" aria-label="Search lists and components" className="pl-9" />
        </div>
        <Select value={visibilityFilter} onValueChange={(value) => setVisibilityFilter(value as typeof visibilityFilter)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter lists by visibility"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All visibility</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>
        <span className="shrink-0 px-1 text-xs tabular-nums text-muted-foreground">{filteredLists.length} {filteredLists.length === 1 ? "list" : "lists"} shown</span>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-destructive">{error}</p> : null}

      <section aria-label="Your lists" className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {showBookmarks ? (
          <BookmarksCard count={bookmarks.length} />
        ) : null}
        {filteredLists.map((list) => (
          <CuratedListCard
            key={list.id}
            list={list}
            username={username}
            plus={mine.plus}
            busy={workingListId === list.id}
            onVisibility={async () => {
              setWorkingListId(list.id);
              setError(null);
              const result = await setListVisibility({ data: { listId: list.id, visibility: list.visibility === "public" ? "private" : "public" } });
              setWorkingListId(null);
              if (!result.ok) { setError("Could not change this list's visibility."); return; }
              await invalidate();
            }}
            onDelete={async () => {
              setWorkingListId(list.id);
              setError(null);
              const result = await deleteList({ data: { listId: list.id } });
              setWorkingListId(null);
              if (!result.ok) { setError("Could not delete this list."); return false; }
              await invalidate();
              return true;
            }}
          />
        ))}
      </section>

      {mine.lists.length === 0 ? (
        <EmptyState
          icon={ListIcon}
          title="Create your first list"
          description="Start a private shortlist or publish a curated collection on your profile. Add components from their detail pages."
          action={mine.plus ? <Button size="sm" onClick={() => setCreateOpen(true)}>New list</Button> : undefined}
          className="mt-6 min-h-64"
        />
      ) : filteredLists.length === 0 && !showBookmarks ? (
        <EmptyState
          icon={Search}
          title="No matching lists"
          description="Try another search or visibility filter."
          action={<Button variant="outline" size="sm" onClick={() => { setQuery(""); setVisibilityFilter("all"); }}>Clear filters</Button>}
          className="mt-6 min-h-48"
        />
      ) : null}

      <NewListDialog
        key={createKey}
        open={createOpen}
        onOpenChange={setCreateOpen}
        busy={creating}
        onCreate={async (title, visibility) => {
          setCreating(true);
          setError(null);
          const result = await createList({ data: { title, visibility } });
          setCreating(false);
          if (!result.ok) { setError(result.error ?? "Could not create this list."); return; }
          setCreateOpen(false);
          setCreateKey((key) => key + 1);
          await invalidate();
        }}
      />
    </div>
  );
}

function ListStat({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className={`border-border/60 p-4 ${className}`}>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function BookmarksCard({ count }: { count: number }) {
  return (
    <article className="flex min-h-64 flex-col rounded-xl border border-border/60 bg-card/40 p-4 transition-[background-color,border-color,box-shadow] duration-150 hover:border-foreground/15 hover:bg-card/60 hover:shadow-sm motion-reduce:transition-none">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground"><Bookmark className="size-4" /></span>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] text-muted-foreground"><Lock className="size-3" />Private</span>
      </div>
      <div className="mt-5">
        <h2 className="text-base font-semibold">Bookmarks</h2>
        <p className="mt-1 text-xs text-muted-foreground">Your quick-save space for components you want to revisit.</p>
      </div>
      <div className="mt-5 flex flex-1 items-center rounded-lg border border-dashed border-border/60 bg-background/30 px-4 py-5">
        <div><p className="text-2xl font-semibold tabular-nums">{count}</p><p className="mt-0.5 text-xs text-muted-foreground">saved {count === 1 ? "component" : "components"}</p></div>
      </div>
      <Button asChild variant="outline" size="sm" className="mt-4 w-full gap-1.5"><Link to="/dashboard/bookmarks">Open bookmarks<ExternalLink className="size-3.5" /></Link></Button>
    </article>
  );
}

function CuratedListCard({
  list,
  username,
  plus,
  busy,
  onVisibility,
  onDelete,
}: {
  list: MyList;
  username: string | null;
  plus: boolean;
  busy: boolean;
  onVisibility: () => Promise<void>;
  onDelete: () => Promise<boolean>;
}) {
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isPublic = list.visibility === "public";

  const copyLink = async () => {
    if (!username || !isPublic) return;
    await navigator.clipboard.writeText(`${window.location.origin}/${username}#list-${list.name}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <article className="flex min-h-64 min-w-0 flex-col rounded-xl border border-border/60 bg-card/40 p-4 transition-[background-color,border-color,box-shadow] duration-150 hover:border-foreground/15 hover:bg-card/60 hover:shadow-sm motion-reduce:transition-none">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground"><ListIcon className="size-4" /></span>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] capitalize text-muted-foreground">
          {isPublic ? <Globe className="size-3" /> : <Lock className="size-3" />}{list.visibility}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="truncate text-base font-semibold">{list.title}</h2>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{list.items.length} {list.items.length === 1 ? "component" : "components"}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{isPublic ? "Published on your profile as curated by you." : "Visible only to you."}</p>
      </div>

      <div className="mt-5 flex flex-1 flex-col gap-1.5 rounded-lg border border-border/50 bg-background/25 p-2">
        {list.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-5 text-center">
            <ListIcon className="size-5 text-muted-foreground/60" />
            <p className="mt-2 text-xs text-muted-foreground">Add components from their detail pages.</p>
          </div>
        ) : (
          <>
            {list.items.slice(0, 3).map((item) => (
              <Link
                key={`${item.namespace}/${item.name}`}
                to="/components/$namespace/$name"
                params={{ namespace: item.namespace, name: item.name }}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors duration-150 hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-semibold uppercase">{item.title.slice(0, 1)}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.title}</span>
                <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">@{item.namespace}/{item.name}</span>
              </Link>
            ))}
            {list.items.length > 3 ? <p className="px-2.5 py-1 text-[11px] text-muted-foreground">+{list.items.length - 3} more</p> : null}
          </>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1 border-t border-border/50 pt-3">
        {isPublic && username ? (
          <Button asChild variant="outline" size="sm" className="min-w-0 flex-1 gap-1.5"><Link to="/$username" params={{ username }} hash={`list-${list.name}`}>View on profile<ExternalLink className="size-3.5" /></Link></Button>
        ) : (
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">{isPublic ? "Add a username to share" : "Private list"}</div>
        )}

        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={isPublic ? `Make ${list.title} private` : `Make ${list.title} public`} disabled={busy || (!plus && !isPublic)} onClick={() => void onVisibility()}>{isPublic ? <Lock /> : <Globe />}</Button></TooltipTrigger><TooltipContent>{isPublic ? "Make private" : plus ? "Make public" : "Resume Plus to publish"}</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Copy link to ${list.title}`} disabled={!isPublic || !username} onClick={() => void copyLink()}>{copied ? <Check className="text-receipt" /> : <LinkIcon />}</Button></TooltipTrigger><TooltipContent>{copied ? "Copied" : isPublic ? "Copy link" : "Make public to share"}</TooltipContent></Tooltip>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Tooltip><TooltipTrigger asChild><DialogTrigger asChild><Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${list.title}`} disabled={busy}><Trash2 /></Button></DialogTrigger></TooltipTrigger><TooltipContent>Delete list</TooltipContent></Tooltip>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete “{list.title}”?</DialogTitle><DialogDescription>This removes the list, not its components. This action cannot be undone.</DialogDescription></DialogHeader>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" disabled={busy} onClick={async () => { if (await onDelete()) setDeleteOpen(false); }}>{busy ? "Deleting…" : "Delete list"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
}
