import { useEffect, useState } from "react";
import { HiChevronLeft as ChevronLeft, HiChevronRight as ChevronRight } from "react-icons/hi2";

import { ToolListingImage } from "@/components/tool-listing-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ToolImageCarousel({
  images,
  domain,
  title,
  className,
  imageClassName,
}: {
  images: string[];
  domain: string;
  title: string;
  className?: string;
  imageClassName?: string;
}) {
  const [index, setIndex] = useState(0);
  const safeImages = images.filter(Boolean);
  const count = safeImages.length;

  useEffect(() => setIndex((current) => Math.min(current, Math.max(0, count - 1))), [count]);

  function move(delta: number) {
    if (count < 2) return;
    setIndex((current) => (current + delta + count) % count);
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title} screenshots`}
      className={cn("group/carousel relative overflow-hidden", className)}
    >
      <ToolListingImage
        src={safeImages[index] ?? null}
        domain={domain}
        alt={count ? `${title} screenshot ${index + 1} of ${count}` : ""}
        className="size-full"
        imageClassName={imageClassName}
      />
      {count > 1 ? (
        <>
          <div className="absolute inset-x-2 top-1/2 z-20 flex -translate-y-1/2 justify-between opacity-0 transition-opacity group-hover/carousel:opacity-100 group-focus-within/carousel:opacity-100 motion-reduce:transition-none">
            <Button type="button" variant="outline" size="icon" className="pointer-events-auto size-11 rounded-full border-white/20 bg-black/70 text-white shadow-sm backdrop-blur-sm hover:bg-black/85 hover:text-white" aria-label="Previous screenshot" onClick={(event) => { event.preventDefault(); event.stopPropagation(); move(-1); }}><ChevronLeft /></Button>
            <Button type="button" variant="outline" size="icon" className="pointer-events-auto size-11 rounded-full border-white/20 bg-black/70 text-white shadow-sm backdrop-blur-sm hover:bg-black/85 hover:text-white" aria-label="Next screenshot" onClick={(event) => { event.preventDefault(); event.stopPropagation(); move(1); }}><ChevronRight /></Button>
          </div>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full bg-background/75 px-2 py-1.5 backdrop-blur-sm" aria-hidden="true">
            {safeImages.map((image, dot) => <span key={image} className={cn("size-1.5 rounded-full", dot === index ? "bg-foreground" : "bg-muted-foreground/40")} />)}
          </div>
          <span className="sr-only" aria-live="polite">Screenshot {index + 1} of {count}</span>
        </>
      ) : null}
    </div>
  );
}
