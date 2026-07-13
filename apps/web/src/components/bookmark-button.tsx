/** Bookmark toggle — save any component for yourself (never affects rank). */
import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";

export function BookmarkButton({ namespace, name }: { namespace: string; name: string }) {
  const [saved, setSaved] = useState<boolean | null>(null);

  useEffect(() => {
    void isBookmarked({ data: { namespace, name } }).then(setSaved);
  }, [namespace, name]);

  async function onToggle() {
    if (saved === null) return;
    setSaved(!saved); // optimistic
    const res = await toggleBookmark({ data: { namespace, name } });
    if (!res.ok) setSaved(saved);
    else setSaved(res.bookmarked ?? false);
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      title={saved ? "Remove bookmark" : "Bookmark"}
      className="flex size-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      <Bookmark className={`size-4 ${saved ? "fill-current text-foreground" : ""}`} />
    </button>
  );
}
