/**
 * List creation dialog — name + visibility, replacing the old
 * window.prompt/confirm flow. Purely presentational: the caller owns
 * the create action.
 */
import { useState } from "react";
import { Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function NewListDialog({
  open,
  onOpenChange,
  onCreate,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (title: string, visibility: "public" | "private") => void;
  busy?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const valid = title.trim().length > 0 && title.trim().length <= 80;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New list</DialogTitle>
          <DialogDescription>
            Group components under a name. Public lists show on your profile; saving never affects
            a component&apos;s rank or earnings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Great starter components"
            maxLength={80}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && valid && !busy) onCreate(title.trim(), visibility);
            }}
          />
          <div className="flex rounded-md border border-border/60 p-0.5">
            {(["private", "public"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={visibility === v}
                onClick={() => setVisibility(v)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors ${
                  visibility === v ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "public" ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                {v === "public" ? "Public" : "Private"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {visibility === "public"
              ? "Anyone can see this list on your profile."
              : "Only you can see this list. You can make it public later."}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={!valid || busy} onClick={() => onCreate(title.trim(), visibility)}>
            {busy ? "Creating…" : "Create list"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
