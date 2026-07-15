import { useRef, useState, type FormEvent } from "react";
import { HiArrowLeft as ArrowLeft, HiArrowRight as ArrowRight, HiArrowTopRightOnSquare as External, HiGlobeAlt as Globe, HiArrowPath as Loader, HiPhoto as Photo, HiTrash as Trash } from "react-icons/hi2";

import { ExternalSitePreview } from "@/components/external-site-preview";
import { ToolImageCarousel } from "@/components/tool-image-carousel";
import { ToolListingImage } from "@/components/tool-listing-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DnsRecordCard, OneClickSetup } from "@/components/domain-verify";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/taxonomy";
import type { ToolListingInput } from "@/lib/tool-listings";

export interface ToolListingPreview {
  canonicalUrl: string;
  title: string;
  description: string;
  imageUrl: string | null;
}

function normalizeHttpsUrl(value: string): string | null {
  try {
    const trimmed = value.trim();
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export interface ToolListingEditorProps {
  onInspect: (siteUrl: string) => Promise<{ ok: boolean; error?: string; metadata?: ToolListingPreview; verificationDomain?: string }>;
  onSubmit: (input: ToolListingInput) => Promise<{ ok: boolean; error?: string }>;
  onSubmitted: () => Promise<void> | void;
  onCreateDomain: (domain: string) => Promise<{ ok: boolean; error?: string; record?: { domain: string; token: string; verified: boolean } }>;
  onVerifyDomain: (domain: string) => Promise<{ ok: boolean; error?: string; verified: boolean }>;
  onDiscoverDomainConnect: (domain: string) => Promise<{ supported: boolean; provider?: string; applyUrl?: string }>;
}

export function ToolListingEditor({ onInspect, onSubmit, onSubmitted, onCreateDomain, onVerifyDomain, onDiscoverDomainConnect }: ToolListingEditorProps) {
  const [siteUrl, setSiteUrl] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);
  const [pricing, setPricing] = useState<ToolListingInput["pricing"]>("free");
  const [showcaseImageUrls, setShowcaseImageUrls] = useState<string[]>([]);
  const [preview, setPreview] = useState<ToolListingPreview | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [verificationDomain, setVerificationDomain] = useState<string | null>(null);
  const [domainRecord, setDomainRecord] = useState<{ domain: string; token: string; verified: boolean } | null>(null);
  const [domainConnect, setDomainConnect] = useState<{ supported: boolean; provider?: string; applyUrl?: string } | null>(null);
  const [domainBusy, setDomainBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const verificationAttempt = useRef(0);

  async function inspect() {
    setInspecting(true); setError(""); setPreview(null);
    const normalizedUrl = normalizeHttpsUrl(siteUrl);
    if (!normalizedUrl) { setInspecting(false); setError("Enter a valid HTTPS site URL."); return; }
    setSiteUrl(normalizedUrl);
    const result = await onInspect(normalizedUrl);
    setInspecting(false);
    if (!result.ok) {
      if (result.verificationDomain) {
        setVerificationDomain(result.verificationDomain); setDomainRecord(null); setDomainConnect(null); setError("");
        void prepareVerification(result.verificationDomain);
      }
      else setError(result.error ?? "Could not inspect the site.");
      return;
    }
    const metadata = result.metadata!;
    setPreview(metadata);
    if (!title) setTitle(metadata.title);
    if (!description) setDescription(metadata.description);
    if (!name) setName((metadata.title || new URL(metadata.canonicalUrl).hostname).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64));
  }

  async function prepareVerification(domain: string) {
    const attempt = ++verificationAttempt.current;
    setDomainBusy(true); setError("");
    const result = await onCreateDomain(domain);
    if (attempt !== verificationAttempt.current) return;
    if (!result.ok || !result.record) { setDomainBusy(false); setError(result.error ?? "Could not prepare domain verification."); return; }
    setDomainRecord(result.record);
    const discovery = await onDiscoverDomainConnect(domain);
    if (attempt !== verificationAttempt.current) return;
    setDomainConnect(discovery);
    setDomainBusy(false);
  }

  function closeVerification() {
    verificationAttempt.current += 1;
    setVerificationDomain(null); setDomainRecord(null); setDomainConnect(null); setDomainBusy(false); setError("");
  }

  async function checkVerification() {
    if (!verificationDomain) return;
    setDomainBusy(true); setError("");
    const result = await onVerifyDomain(verificationDomain);
    setDomainBusy(false);
    if (!result.ok || !result.verified) { setError(result.error ?? "TXT record not found yet."); return; }
    closeVerification();
    await inspect();
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError("");
    const normalizedUrl = normalizeHttpsUrl(siteUrl);
    if (!normalizedUrl) { setSubmitting(false); setError("Enter a valid HTTPS site URL."); return; }
    setSiteUrl(normalizedUrl);
    if (showcaseImageUrls.length === 0) { setSubmitting(false); setError("Upload at least one showcase image."); return; }
    const result = await onSubmit({ siteUrl: normalizedUrl, name, title, description, category, pricing, showcaseImageUrls });
    setSubmitting(false);
    if (!result.ok) { setError(result.error ?? "Could not submit the listing."); return; }
    await onSubmitted();
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (showcaseImageUrls.length + selected.length > 6) { setError("Upload up to 6 showcase images."); return; }
    setUploading(true); setError("");
    const uploaded: string[] = [];
    try {
      for (const file of selected) {
        if (file.size > 2 * 1024 * 1024) throw new Error(`${file.name} is larger than 2 MB.`);
        const form = new FormData(); form.set("file", file);
        const response = await fetch("/api/upload-tool-image", { method: "POST", body: form });
        const result = await response.json() as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error ?? `Could not upload ${file.name}.`);
        uploaded.push(result.url);
      }
      setShowcaseImageUrls((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      if (uploaded.length) setShowcaseImageUrls((current) => [...current, ...uploaded]);
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload the showcase images.");
    } finally {
      setUploading(false);
    }
  }

  function moveImage(index: number, delta: number) {
    setShowcaseImageUrls((current) => {
      const destination = index + delta;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
  }

  return (
    <form onSubmit={submit} className="grid w-full gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(28rem,1.2fr)]">
      <div className="flex flex-col gap-5 rounded-xl border border-border/60 bg-card/40 p-6">
        <div>
          <h2 className="text-sm font-semibold">Tool or site details</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Only owner-authorized sites on a domain verified in Settings may be submitted.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tool-url">Verified HTTPS URL</Label>
          <div className="flex gap-2">
            <Input id="tool-url" type="url" value={siteUrl} onChange={(event) => { setSiteUrl(event.target.value); setPreview(null); }} placeholder="https://tool.example.com" required />
            <Button type="button" variant="outline" disabled={inspecting || !siteUrl} onClick={inspect}>{inspecting ? <Loader className="size-4 animate-spin" /> : <Globe className="size-4" />} Inspect</Button>
          </div>
        </div>
        <div className="flex flex-col gap-2"><Label htmlFor="tool-title">Title</Label><Input id="tool-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="tool-slug">Listing slug</Label><Input id="tool-slug" value={name} onChange={(event) => setName(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={64} required /><p className="text-xs text-muted-foreground">Used in the Modulora detail URL.</p></div>
        <div className="flex flex-col gap-2"><Label htmlFor="tool-description">Description</Label><textarea id="tool-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={5} minLength={24} maxLength={500} required className="resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="tool-category">Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger id="tool-category"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex flex-col gap-2"><Label htmlFor="tool-pricing">Pricing</Label><Select value={pricing} onValueChange={(value) => setPricing(value as ToolListingInput["pricing"])}><SelectTrigger id="tool-pricing"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="freemium">Freemium</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Describes pricing on your site. Checkout remains external.</p></div>
        <div className="flex flex-col gap-3">
          <div><Label htmlFor="tool-images">Site thumbnails</Label><p className="mt-1 text-xs text-muted-foreground">Upload 1–6 creator-owned PNG, JPEG, or WebP images up to 2 MB each. The first image is the catalog cover.</p></div>
          {showcaseImageUrls.length ? (
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {showcaseImageUrls.map((url, index) => (
                <li key={url} className="overflow-hidden rounded-lg border border-border/60 bg-secondary/20">
                  <ToolListingImage src={url} domain="Uploaded image" className="aspect-[4/3] w-full" />
                  <div className="flex items-center justify-between gap-1 p-1">
                    <span className="pl-1 text-[10px] text-muted-foreground">{index === 0 ? "Cover" : `${index + 1}`}</span>
                    <div className="flex">
                      <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} aria-label={`Move image ${index + 1} left`} onClick={() => moveImage(index, -1)}><ArrowLeft /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" disabled={index === showcaseImageUrls.length - 1} aria-label={`Move image ${index + 1} right`} onClick={() => moveImage(index, 1)}><ArrowRight /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={`Remove image ${index + 1}`} onClick={() => setShowcaseImageUrls((current) => current.filter((item) => item !== url))}><Trash /></Button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          {showcaseImageUrls.length < 6 ? <label htmlFor="tool-images" className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"><Photo className="size-4" />{uploading ? "Uploading…" : showcaseImageUrls.length ? "Add images" : "Upload site thumbnails"}<input id="tool-images" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={uploading} className="sr-only" onChange={(event) => { void uploadImages(event.currentTarget.files); event.currentTarget.value = ""; }} /></label> : null}
        </div>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button type="submit" disabled={submitting || inspecting || uploading || !preview || showcaseImageUrls.length === 0}>{submitting ? <Loader className="size-4 animate-spin" /> : null} Submit for usefulness review</Button>
        <p className="text-xs leading-relaxed text-muted-foreground">Submission enters the curator queue. Approval evaluates usefulness and catalog relevance; it is not a security or legal certification.</p>
      </div>

      <div className="min-h-[34rem] overflow-hidden rounded-xl border border-border/60 bg-card/30">
        {preview ? (
          <div className="flex h-full flex-col">
            {showcaseImageUrls.length ? <ToolImageCarousel images={showcaseImageUrls} domain={new URL(preview.canonicalUrl).hostname} title={title || preview.title} className="aspect-[16/10] min-h-80 border-b border-border/60" /> : <ExternalSitePreview url={preview.canonicalUrl} title={`Live preview of ${preview.title || title}`} imageUrl={preview.imageUrl} imageAlt={`Open Graph preview for ${preview.title || title}`} className="aspect-[16/10] min-h-80 border-b border-border/60" />}
            <div className="flex flex-1 flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-4"><div><p className="text-lg font-semibold">{title || preview.title}</p><p className="text-sm text-muted-foreground">{description || preview.description}</p></div><External className="mt-1 size-4 shrink-0 text-muted-foreground" /></div>
              <p className="mt-auto text-xs text-muted-foreground">The live preview keeps forms and popups disabled. If a site blocks framing or cannot run embedded, switch to its Open Graph image or open it in a new tab.</p>
            </div>
          </div>
        ) : <div className="flex h-full min-h-[34rem] flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground"><Globe className="size-8" /><p className="text-sm font-medium text-foreground">Inspect a verified site</p><p className="max-w-sm text-xs">Modulora will fetch its Open Graph metadata, mirror the preview image, and prepare the isolated live preview.</p></div>}
      </div>

      <Dialog open={Boolean(verificationDomain)} onOpenChange={(open) => { if (!open) closeVerification(); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Verify {verificationDomain}</DialogTitle><DialogDescription>Prove control of this domain before Modulora fetches its metadata or creates a listing.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4">
            {!domainRecord ? domainBusy ? <div className="flex min-h-24 items-center justify-center gap-2 rounded-lg border border-border/60 bg-secondary/20 text-sm text-muted-foreground"><Loader className="size-4 animate-spin" /> Preparing verification options…</div> : <Button type="button" variant="outline" onClick={() => verificationDomain && void prepareVerification(verificationDomain)}>Retry verification setup</Button> : (
              <>
                {domainConnect?.supported && domainConnect.provider && domainConnect.applyUrl ? <OneClickSetup domain={verificationDomain ?? ""} provider={domainConnect.provider} onConnect={() => { window.location.href = domainConnect.applyUrl!; }} /> : null}
                {domainConnect && !domainConnect.supported ? <p className="text-xs leading-relaxed text-muted-foreground">Your DNS provider does not currently advertise Modulora&apos;s Domain Connect template. Use the TXT record below instead.</p> : null}
                <DnsRecordCard record={{ type: "TXT", name: `_modulora.${domainRecord.domain}`, value: `modulora-verify=${domainRecord.token}`, status: "pending" }} />
                <Button type="button" disabled={domainBusy} onClick={checkVerification}>{domainBusy ? <Loader className="size-4 animate-spin" /> : null} Check DNS record</Button>
              </>
            )}
            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={closeVerification}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
