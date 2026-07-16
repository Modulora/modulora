import { Link } from "@tanstack/react-router";
import { HiArrowLeft as ArrowLeft, HiArrowTopRightOnSquare as External, HiCheckBadge as Check, HiGlobeAlt as Globe } from "react-icons/hi2";
import { ExternalSitePreview } from "@/components/external-site-preview";
import { ToolImageCarousel } from "@/components/tool-image-carousel";
import { ToolListingImage } from "@/components/tool-listing-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatListingDate, type CatalogItem } from "@/data/catalog";

export function ToolListingDetail({ item }: { item: CatalogItem }) {
  const site = item.site;
  if (!site) return null;
  const images = site.showcaseImageUrls.length ? site.showcaseImageUrls : site.ogImageUrl ? [site.ogImageUrl] : [];
  const listedDate = formatListingDate(item.listedAt);
  const domainEvidence = item.evidence.find((record) => record.type === "domain-verified" && record.status === "passed");
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground">
        <Link to="/components"><ArrowLeft className="size-4" /> Back to listings</Link>
      </Button>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="outline">Tool</Badge><Badge variant="secondary">{site.pricing === "freemium" ? "Freemium" : site.pricing === "paid" ? "Paid" : "Free"}</Badge><Badge variant="secondary">{item.category}</Badge></div>
          <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          <p className="mt-3 text-xs text-muted-foreground">Listed by <Link to="/$username" params={{ username: item.namespace }} className="underline underline-offset-2">@{item.namespace}</Link>{listedDate ? <> on <time dateTime={item.listedAt}>{listedDate}</time></> : null}</p>
        </div>
        <Button asChild><a href={site.url} target="_blank" rel="noreferrer"><External className="size-4" /> Visit {site.domain}</a></Button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Live site preview</h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <ExternalSitePreview
          url={site.url}
          title={`Live preview of ${item.title}`}
          imageUrl={site.ogImageUrl}
          imageAlt={`Open Graph preview for ${item.title}`}
          className="aspect-[16/9] min-h-[28rem]"
        />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Site thumbnails</h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
          <ToolImageCarousel images={images} domain={site.domain} title={item.title} className="aspect-[16/9] min-h-[28rem]" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><Globe className="size-4" /> Site metadata and fallback</h2>{site.ogImageUrl ? <ToolListingImage src={site.ogImageUrl} domain={site.domain} alt={`Open Graph preview for ${item.title}`} className="mt-4 aspect-[16/9] w-full rounded-lg border border-border/60" /> : null}<dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Fetched title</dt><dd>{site.ogTitle || "Not provided"}</dd></div><div><dt className="text-xs text-muted-foreground">Fetched description</dt><dd className="leading-relaxed">{site.ogDescription || "Not provided"}</dd></div></dl></div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><Check className="size-4 text-receipt" /> Scoped evidence</h2><p className="mt-3 text-sm leading-relaxed">{domainEvidence ? `The creator proved DNS control of ${site.domain}.` : "No public domain-control evidence is available."}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Domain control and curator approval do not certify security, privacy, legality, accessibility, or ongoing usefulness.</p></div>
      </div>
    </div>
  );
}
