/**
 * Live card preview (#53): a lazy iframe onto /preview/$ns/$name. Mounts
 * only when the card scrolls into view; pointer events stay off so the card
 * click navigates. Demo-catalog items (no live source) keep the static mock.
 */
import { useEffect, useRef, useState } from "react";
import { ComponentPreview } from "@/components/component-preview";
import { Logo } from "@/components/logo";
import { usePageTheme } from "@/lib/use-page-theme";
import type { CatalogItem } from "@/data/catalog";

/** The minimum a live iframe preview needs — dashboards pass this. */
export interface LivePreviewItem {
  namespace: string;
  name: string;
  title: string;
  live: true;
}

export function LiveCardPreview({
  item,
  theme,
  className,
}: {
  item: CatalogItem | LivePreviewItem;
  /** Defaults to the site's current light/dark mode. */
  theme?: "light" | "dark";
  className?: string;
}) {
  const pageTheme = usePageTheme();
  const resolved = theme ?? pageTheme;
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Demo catalog entries have no live source — keep their static mock.
  const live = item.live === true;

  useEffect(() => {
    if (!live || !ref.current) return;
    const el = ref.current;
    // Near-viewport check that works even where IntersectionObserver never
    // fires (occluded/headless pages): rect on mount + scroll/resize
    // fallback, with IO as the efficient path when it does deliver.
    const near = () => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight + 200 && rect.bottom > -200;
    };
    if (near()) {
      setVisible(true);
      return;
    }
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setVisible(true);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) show();
      },
      { rootMargin: "200px" },
    );
    const onScroll = () => {
      if (near()) show();
    };
    observer.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [live]);

  if (!live) return <ComponentPreview item={item as CatalogItem} theme={resolved} className={className} />;

  return (
    <div
      ref={ref}
      className={`${className ?? ""} relative aspect-[4/3] overflow-hidden rounded-sm border ${
        resolved === "dark" ? "border-white/10 bg-[#111]" : "border-black/10 bg-[#f5f5f3]"
      }`}
    >
      {visible ? (
        <iframe
          src={`/preview/${item.namespace}/${item.name}?theme=${resolved}`}
          title={`${item.title} preview`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          // Display-only: the card handles clicks; the sandbox page itself is
          // already cross-origin-isolated for the untrusted code.
          className={`pointer-events-none size-full border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
      {!loaded ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Logo className={`size-6 animate-[logo-breathe_2.2s_ease-in-out_infinite] ${resolved === "dark" ? "text-white/30" : "text-black/40"}`} />
        </div>
      ) : null}
    </div>
  );
}
