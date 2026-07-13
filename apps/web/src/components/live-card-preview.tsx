/**
 * Live card preview (#53): a lazy iframe onto /preview/$ns/$name. Mounts
 * only when the card scrolls into view; pointer events stay off so the card
 * click navigates. Demo-catalog items (no live source) keep the static mock.
 */
import { useEffect, useRef, useState } from "react";
import { ComponentPreview } from "@/components/component-preview";
import { Logo } from "@/components/logo";
import type { CatalogItem } from "@/data/catalog";

export function LiveCardPreview({
  item,
  theme = "light",
  className,
}: {
  item: CatalogItem;
  theme?: "light" | "dark";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Demo catalog entries have no live source — keep their static mock.
  const live = item.live === true;

  useEffect(() => {
    if (!live || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [live]);

  if (!live) return <ComponentPreview item={item} theme={theme} className={className} />;

  return (
    <div
      ref={ref}
      className={`${className ?? ""} relative aspect-[4/3] overflow-hidden rounded-sm border ${
        theme === "dark" ? "border-white/10 bg-[#111]" : "border-black/10 bg-[#f5f5f3]"
      }`}
    >
      {visible ? (
        <iframe
          src={`/preview/${item.namespace}/${item.name}?theme=${theme}`}
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
          <Logo className="size-6 animate-[logo-breathe_2.2s_ease-in-out_infinite] text-black/40" />
        </div>
      ) : null}
    </div>
  );
}
