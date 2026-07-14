import type { ReactNode } from "react";
import type { IconType } from "react-icons";


import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: IconType;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 px-6 py-12 text-center",
        className,
      )}
    >
      <Icon aria-hidden className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      <div className="max-w-sm text-xs leading-relaxed text-muted-foreground">
        {description}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
