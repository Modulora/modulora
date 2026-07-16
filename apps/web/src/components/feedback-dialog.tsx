/**
 * Feedback dialog — a short message straight to the team (Discord).
 * Presentational: the caller owns submission. When the UI category is
 * selected, an optional element picker captures the exact element context.
 */
import { useEffect, useRef, useState } from "react";
import { HiCheck as Check, HiCursorArrowRays as Picker, HiXMark as X } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pickElement, type PickedElement } from "@/lib/element-picker";

export const FEEDBACK_CATEGORIES = [
  { id: "bug", label: "Bug" },
  { id: "idea", label: "Idea" },
  { id: "ui", label: "UI issue" },
  { id: "other", label: "Other" },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["id"];

export interface FeedbackSubmission {
  message: string;
  category: FeedbackCategory;
  element: PickedElement | null;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
  done = false,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: FeedbackSubmission) => void;
  busy?: boolean;
  done?: boolean;
  error?: string | null;
}) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [element, setElement] = useState<PickedElement | null>(null);
  const [picking, setPicking] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const valid = message.trim().length >= 4;
  useEffect(() => {
    if (done) closeRef.current?.focus();
  }, [done]);

  async function startPicking() {
    setPicking(true);
    try {
      const picked = await pickElement();
      if (picked) setElement(picked);
    } finally {
      setPicking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!picking) onOpenChange(next); }} modal={!picking}>
      <DialogContent
        className={`max-w-md overflow-hidden p-0 ${picking ? "invisible" : ""}`}
        onEscapeKeyDown={(event) => { if (picking) event.preventDefault(); }}
        onInteractOutside={(event) => { if (picking) event.preventDefault(); }}
      >
        <DialogHeader className="gap-2 px-6 pb-0 pt-6 pr-12">
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription className="max-w-sm leading-relaxed">
            Bug, idea, or complaint — it goes straight to the team.
          </DialogDescription>
        </DialogHeader>
        <form
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !busy) onSubmit({ message: message.trim(), category, element: category === "ui" ? element : null });
          }}
        >
          <div className="flex min-h-56 flex-col px-6 pb-6 pt-5">
            {done ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-receipt" role="status" aria-live="polite">
                <Check className="size-4" aria-hidden="true" /> Sent — thank you.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="feedback-category">Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as FeedbackCategory)}>
                  <SelectTrigger id="feedback-category" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_CATEGORIES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {category === "ui" ? (
                <div className="flex flex-col gap-2">
                  {element ? (
                    <div className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-secondary/25 px-3 py-2">
                      <div className="min-w-0 text-xs leading-relaxed">
                        <p className="truncate font-mono">{element.selector}</p>
                        <p className="mt-0.5 truncate text-muted-foreground">{element.text || element.rect}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove picked element" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setElement(null)}>
                        <X />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" className="justify-start gap-2" onClick={() => void startPicking()}>
                      <Picker className="size-4" /> Pick the element on this page (optional)
                    </Button>
                  )}
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
              <Label htmlFor="feedback-message">Message</Label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                maxLength={2000}
                autoFocus
                placeholder="What's on your mind?"
                aria-invalid={Boolean(error)}
                aria-describedby="feedback-message-meta"
                className="min-h-28 w-full resize-none rounded-lg border border-input bg-background/40 px-3 py-3 text-sm leading-relaxed outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
              <div id="feedback-message-meta" className="flex min-h-5 items-start justify-between gap-4">
                {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : <span />}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{message.length}/2000</span>
              </div>
              </div>
              </div>
            )}
          </div>
          <span className="sr-only" role="status" aria-live="polite">{busy ? "Sending feedback" : ""}</span>
          <DialogFooter className="border-t border-border/50 bg-secondary/20 px-6 py-4 pt-4">
            {done ? (
              <Button ref={closeRef} type="button" size="sm" className="min-w-20" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            ) : (
              <>
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="min-w-20" disabled={!valid || busy}>
                {busy ? "Sending…" : "Send"}
              </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
