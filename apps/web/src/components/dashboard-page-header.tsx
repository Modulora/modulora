import type { ReactNode } from "react";
import type { IconType } from "react-icons";


import { cn } from "@/lib/utils";

export function DashboardPageHeader({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  icon?: IconType;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="dashboard-page-header"
      className={cn("flex flex-col items-start justify-between gap-4 sm:flex-row", className)}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon ? <Icon aria-hidden className="size-5 shrink-0 text-muted-foreground" /> : null}
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>
        {description ? (
          <div className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className="w-full shrink-0 [&>*]:w-full sm:w-auto sm:[&>*]:w-auto">{action}</div> : null}
    </div>
  );
}
