import { useEffect, useState } from "react";
import { HiGlobeAlt as Globe } from "react-icons/hi2";

import { cn } from "@/lib/utils";

export function ToolListingImage({
  src,
  domain,
  alt = "",
  className,
  imageClassName,
}: {
  src?: string | null;
  domain?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  const showImage = mounted && Boolean(src) && failedUrl !== src;

  return (
    <div className={cn("relative overflow-hidden bg-secondary/20", className)}>
      {showImage ? (
        <img src={src!} alt={alt} onError={() => setFailedUrl(src!)} className={cn("size-full object-cover", imageClassName)} />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <Globe className="size-6" />
          <span className="max-w-[80%] truncate text-sm">{domain || "External tool"}</span>
        </div>
      )}
    </div>
  );
}
