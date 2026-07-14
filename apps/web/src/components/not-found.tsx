/**
 * 404 — styled like one of our component cards whose component is
 * missing. On-brand joke, honest message, two exits.
 */
import { Link } from "@tanstack/react-router";
import { HiArrowLeft as ArrowLeft, HiMagnifyingGlassMinus as SearchX } from "react-icons/hi2";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="flex min-h-[70svh] items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="w-full max-w-md"
      >
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
          <div className="flex h-44 flex-col items-center justify-center gap-2 border-b border-border/60 bg-background/60">
            <SearchX className="size-6 text-muted-foreground/50" />
            <p className="font-mono text-5xl font-semibold tracking-tight text-muted-foreground/40">404</p>
          </div>
          <div className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">not-found</p>
              <p className="text-xs text-muted-foreground">by nobody · this page doesn&apos;t exist</p>
            </div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
              unpublished
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/"><ArrowLeft className="size-3.5" /> Home</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/components">Browse components</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
