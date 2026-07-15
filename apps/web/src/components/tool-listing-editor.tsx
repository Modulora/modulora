import { useState, type FormEvent } from "react";
import { HiArrowTopRightOnSquare as External, HiGlobeAlt as Globe, HiArrowPath as Loader } from "react-icons/hi2";

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
  const [preview, setPreview] = useState<ToolListingPreview | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [verificationDomain, setVerificationDomain] = useState<string | null>(null);
  const [domainRecord, setDomainRecord] = useState<{ domain: string; token: string; verified: boolean } | null>(null);
  const [domainConnect, setDomainConnect] = useState<{ supported: boolean; provider?: string; applyUrl?: string } | null>(null);
  const [domainBusy, setDomainBusy] = useState(false);

  async function inspect() {
    setInspecting(true); setError(""); setPreview(null);
    const result = await onInspect(siteUrl);
    setInspecting(false);
    if (!result.ok) {
      if (result.verificationDomain) { setVerificationDomain(result.verificationDomain); setDomainRecord(null); setDomainConnect(null); setError(""); }
      else setError(result.error ?? "Could not inspect the site.");
      return;
    }
    const metadata = result.metadata!;
    setPreview(metadata);
    if (!title) setTitle(metadata.title);
    if (!description) setDescription(metadata.description);
    if (!name) setName((metadata.title || new URL(metadata.canonicalUrl).hostname).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64));
  }

  async function startVerification() {
    if (!verificationDomain) return;
    setDomainBusy(true); setError("");
    const result = await onCreateDomain(verificationDomain);
    if (!result.ok || !result.record) { setDomainBusy(false); setError(result.error ?? "Could not start domain verification."); return; }
    setDomainRecord(result.record);
    setDomainConnect(await onDiscoverDomainConnect(verificationDomain));
    setDomainBusy(false);
  }

  async function checkVerification() {
    if (!verificationDomain) return;
    setDomainBusy(true); setError("");
    const result = await onVerifyDomain(verificationDomain);
    setDomainBusy(false);
    if (!result.ok || !result.verified) { setError(result.error ?? "TXT record not found yet."); return; }
    setVerificationDomain(null); setDomainRecord(null); setDomainConnect(null);
    await inspect();
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError("");
    const result = await onSubmit({ siteUrl, name, title, description, category });
    setSubmitting(false);
    if (!result.ok) { setError(result.error ?? "Could not submit the listing."); return; }
    await onSubmitted();
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
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button type="submit" disabled={submitting || inspecting || !preview}>{submitting ? <Loader className="size-4 animate-spin" /> : null} Submit for usefulness review</Button>
        <p className="text-xs leading-relaxed text-muted-foreground">Submission enters the curator queue. Approval evaluates usefulness and catalog relevance; it is not a security or legal certification.</p>
      </div>

      <div className="min-h-[34rem] overflow-hidden rounded-xl border border-border/60 bg-card/30">
        {preview ? (
          <div className="flex h-full flex-col">
            <div className="relative aspect-[16/10] min-h-80 border-b border-border/60 bg-secondary/20">
              <iframe src={preview.canonicalUrl} title={`Live preview of ${preview.title || title}`} sandbox="allow-scripts" referrerPolicy="no-referrer" className="size-full bg-white" />
              {preview.imageUrl ? <img src={preview.imageUrl} alt="" referrerPolicy="no-referrer" className="pointer-events-none absolute bottom-3 right-3 h-20 w-32 rounded-md border border-white/20 object-cover shadow-lg" /> : null}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-4"><div><p className="text-lg font-semibold">{title || preview.title}</p><p className="text-sm text-muted-foreground">{description || preview.description}</p></div><External className="mt-1 size-4 shrink-0 text-muted-foreground" /></div>
              <p className="mt-auto text-xs text-muted-foreground">The iframe uses an opaque sandbox without same-origin access. Sites that block framing still retain their mirrored Open Graph image.</p>
            </div>
          </div>
        ) : <div className="flex h-full min-h-[34rem] flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground"><Globe className="size-8" /><p className="text-sm font-medium text-foreground">Inspect a verified site</p><p className="max-w-sm text-xs">Modulora will fetch its Open Graph metadata, mirror the preview image, and prepare the isolated live preview.</p></div>}
      </div>

      <Dialog open={Boolean(verificationDomain)} onOpenChange={(open) => { if (!open) { setVerificationDomain(null); setDomainRecord(null); setDomainConnect(null); setError(""); } }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Verify {verificationDomain}</DialogTitle><DialogDescription>Prove control of this domain before Modulora fetches its metadata or creates a listing.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4">
            {!domainRecord ? <Button type="button" disabled={domainBusy} onClick={startVerification}>{domainBusy ? <Loader className="size-4 animate-spin" /> : null} Start verification</Button> : (
              <>
                {domainConnect?.supported && domainConnect.provider && domainConnect.applyUrl ? <OneClickSetup domain={verificationDomain ?? ""} provider={domainConnect.provider} onConnect={() => { window.location.href = domainConnect.applyUrl!; }} /> : null}
                <DnsRecordCard record={{ type: "TXT", name: `_modulora.${domainRecord.domain}`, value: `modulora-verify=${domainRecord.token}`, status: "pending" }} />
                <Button type="button" disabled={domainBusy} onClick={checkVerification}>{domainBusy ? <Loader className="size-4 animate-spin" /> : null} Check DNS record</Button>
              </>
            )}
            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setVerificationDomain(null)}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
