/* ─────────────────────────────────────────────────────────
 * PUBLIC PROFILE — /@username
 *
 *    0ms   hidden
 *   60ms   header rises (avatar, name, socials)
 *  160ms   component grid fades in, staggered
 * ───────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Blocks, CalendarDays, Globe } from "lucide-react";

import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon } from "@hugeicons-pro/core-solid-sharp";
import { TerminalSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PriceSeal } from "@/components/money";
import { CopyChip } from "@/components/owned";
import { confirmCheckout } from "@/lib/marketplace";
import { BuyCollectionDialog } from "@/components/collection-view";

import { LiveCardPreview } from "@/components/live-card-preview";
import { GitHubIcon, XIcon } from "@/components/brand-icons";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchPublicProfile } from "@/lib/catalog-db";
import type { CatalogItem } from "@/data/catalog";

export const Route = createFileRoute("/$username")({
  loader: async ({ params }) => {
    const handle = params.username.replace(/^@/, "");
    const data = await fetchPublicProfile({ data: { username: handle } });
    if (!data) throw notFound();
    return data;
  },
  component: Profile,
});

const RISE = { offsetY: 8, spring: { type: "spring" as const, stiffness: 340, damping: 28 }, stagger: 0.05 };

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Pull an @handle out of an x.com/twitter.com URL (or a bare handle). */
function xHandleOf(url: string): string {
  const raw = url.trim().replace(/^@/, "");
  try {
    const segment = new URL(raw.includes("://") ? raw : `https://${raw}`).pathname.split("/").filter(Boolean)[0];
    if (segment) return segment;
  } catch {
    // fall through
  }
  return raw;
}

function Profile() {
  const { profile, components, collections } = Route.useLoaderData();
  const [stage, setStage] = useState(0);

  // Returning from a collection checkout: confirm + clean the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("purchase");
    if (sid) {
      void confirmCheckout({ data: { sessionId: sid } }).then(() => {
        window.history.replaceState(null, "", window.location.pathname);
        window.location.reload();
      });
    }
  }, []);
  useEffect(() => {
    const timers = [setTimeout(() => setStage(1), 60), setTimeout(() => setStage(2), 160)];
    return () => timers.forEach(clearTimeout);
  }, []);

  const joined = new Date(profile.joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <motion.header
        initial={{ opacity: 0, y: RISE.offsetY }}
        animate={{ opacity: stage >= 1 ? 1 : 0, y: stage >= 1 ? 0 : RISE.offsetY }}
        transition={RISE.spring}
        className="flex flex-col gap-5 sm:flex-row sm:items-start"
      >
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-2xl font-semibold text-muted-foreground">
          {profile.image ? (
            <img src={profile.image} alt={profile.name} className="size-full object-cover" />
          ) : (
            (profile.name || profile.username).slice(0, 1).toUpperCase()
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{profile.name || profile.username}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio ? <p className="mt-3 max-w-2xl text-sm leading-relaxed">{profile.bio}</p> : null}

          <TooltipProvider delayDuration={150}>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" /> Joined {joined}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Blocks className="size-3.5" /> {components.length} component{components.length === 1 ? "" : "s"}
            </span>
            {profile.websiteUrl ? (
              <SocialLink
                href={profile.websiteUrl}
                icon={<Globe className="size-3.5" />}
                label={hostOf(profile.websiteUrl) ?? "Website"}
                verifiedVia={profile.websiteVerified ? "a DNS TXT record" : undefined}
              />
            ) : null}
            {profile.githubUsername ? (
              <SocialLink
                href={`https://github.com/${profile.githubUsername}`}
                icon={<GitHubIcon className="size-3.5" />}
                label={profile.githubUsername}
                verifiedVia="GitHub sign-in"
              />
            ) : profile.githubUrl ? (
              <SocialLink href={profile.githubUrl} icon={<GitHubIcon className="size-3.5" />} label="GitHub" />
            ) : null}
            {profile.xUsername ? (
              <SocialLink
                href={`https://x.com/${profile.xUsername}`}
                icon={<XIcon className="size-3" />}
                label={profile.xUsername}
                verifiedVia="X sign-in"
              />
            ) : profile.xUrl ? (
              <SocialLink href={profile.xUrl} icon={<XIcon className="size-3" />} label={xHandleOf(profile.xUrl)} />
            ) : null}
          </div>
          </TooltipProvider>
        </div>
      </motion.header>

      {collections.length > 0 ? (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 2 ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="mt-10"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Collections</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {collections.map((collection) => (
              <CollectionCard key={collection.name} collection={collection} namespace={profile.username} components={components} />
            ))}
          </div>
        </motion.section>
      ) : null}

      <div className="mt-10">
        {components.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: stage >= 2 ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 text-center"
          >
            <Blocks className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No public components yet.</p>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {components.map((item, i) => (
              <motion.div
                key={`${item.namespace}/${item.name}`}
                initial={{ opacity: 0, y: RISE.offsetY }}
                animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : RISE.offsetY }}
                transition={{ ...RISE.spring, delay: i * RISE.stagger }}
              >
                <ProfileCard item={item} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A social link. Verified links (proven via OAuth) get a scoped indicator with
 * the exact basis on hover; self-asserted links render plainly with no claim.
 */
function SocialLink({
  href,
  icon,
  label,
  verifiedVia,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  verifiedVia?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <a href={href} target="_blank" rel="noreferrer noopener me" className="inline-flex items-center gap-1.5 hover:text-foreground">
        {icon} {label}
      </a>
      {verifiedVia ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label={`Verified via ${verifiedVia}`} className="text-emerald-500 outline-none">
              <HugeiconsIcon icon={CheckmarkBadge01Icon} size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Ownership verified via {verifiedVia}.</TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

function ProfileCard({ item }: { item: CatalogItem }) {
  return (
    <Link
      to="/components/$namespace/$name"
      params={{ namespace: item.namespace, name: item.name }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-foreground/20 hover:bg-card/70"
    >
      <LiveCardPreview item={item} className="w-full" />
      <div className="flex items-start justify-between gap-3 px-1 pb-1 pt-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium">{item.title}</h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">{item.category}</p>
        </div>
        <Badge variant={item.sourceModel === "open-source" ? "secondary" : "outline"} className="shrink-0">
          {item.sourceModel === "open-source" ? "Free" : item.purchase?.priceLabel ?? "Paid"}
        </Badge>
      </div>
    </Link>
  );
}


function CollectionCard({ collection, namespace, components }: { collection: import("@/lib/catalog-db").PublicCollection; namespace: string; components: CatalogItem[] }) {
  const installCommand = `npx modulora add @${namespace}/${collection.name}`;
  const byName = new Map(components.map((item) => [item.name, item]));
  const cover = collection.members.map((member) => byName.get(member.name)).find(Boolean);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
      {/* One compact preview opens the collection page (member rail + live previews). */}
      <Link
        to="/components/$namespace/$name"
        params={{ namespace, name: collection.name }}
        className="group relative block overflow-hidden rounded-lg border border-border/40 transition-colors hover:border-foreground/20"
      >
        {cover ? <LiveCardPreview item={cover} className="w-full" /> : <div className="aspect-[4/3] bg-secondary/30" />}
        <span className="absolute bottom-2 right-2 rounded-md border border-white/10 bg-black/70 px-2 py-0.5 text-[11px] text-white/90 backdrop-blur-sm">
          {collection.members.length} component{collection.members.length === 1 ? "" : "s"}
        </span>
      </Link>
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <Link to="/components/$namespace/$name" params={{ namespace, name: collection.name }} className="block truncate font-medium hover:underline">
            {collection.title}
          </Link>
          {collection.description ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{collection.description}</p> : null}
        </div>
        <PriceSeal paid={collection.price != null} label={collection.price != null ? `$${collection.price / 100}` : undefined} />
      </div>
      {(collection.price == null || collection.owned) && collection.cliInstallable ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
          <code className="truncate font-mono text-xs text-muted-foreground">{installCommand}</code>
          <CopyChip label="Copy" text={installCommand} icon={TerminalSquare} />
        </div>
      ) : collection.price != null && !collection.owned ? (
        <BuyCollectionDialog collection={{ namespace, name: collection.name, price: collection.price, license: collection.license }} />
      ) : null}
      {collection.owned ? <p className="px-1 text-[11px] text-emerald-500">You own this collection.</p> : null}
    </div>
  );
}
