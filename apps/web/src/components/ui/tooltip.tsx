import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  // Self-providing (shadcn v4 pattern) so call sites don't need a global provider.
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipPrimitive.Provider>
  );
}
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-xl",
          "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
