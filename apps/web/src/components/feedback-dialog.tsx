/**
 * Feedback dialog — a short message straight to the team (Discord).
 * Presentational: the caller owns submission.
 */
import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  onSubmit: (message: string) => void;
  busy?: boolean;
  done?: boolean;
  error?: string | null;
}) {
  const [message, setMessage] = useState("");
  const valid = message.trim().length >= 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Bug, idea, or complaint — it goes straight to the team.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="flex items-center gap-2 py-4 text-sm text-receipt">
            <Check className="size-4" /> Sent — thank you.
          </div>
        ) : (
          <>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              autoFocus
              placeholder="What's on your mind?"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={!valid || busy} onClick={() => onSubmit(message.trim())}>
                {busy ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
