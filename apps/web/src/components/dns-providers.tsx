/**
 * DNS provider identity — logos and brand coloring for the one-click
 * Domain Connect handoff. The provider name comes from real discovery
 * (the provider's own settings endpoint), so showing its mark and color
 * is nominative: it identifies where the user is being sent.
 *
 * Logos are served from theSVG (thesvg.org); brand hexes come from its
 * registry. Unknown providers fall back to a neutral button.
 */
import type { ComponentType, SVGProps } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  CloudflareMark,
  GoDaddyMark,
  IonosMark,
  NamecheapMark,
  PleskMark,
  PorkbunMark,
  SquarespaceMark,
  VercelMark,
  WixMark,
} from "@/components/dns-provider-icons";

export interface DnsProviderBrand {
  id: string;
  name: string;
  /** Case-insensitive test against the discovery providerDisplayName. */
  match: RegExp;
  /** Official brand color (button background). */
  color: string;
  /** Foreground that stays readable on the brand color. */
  foreground: string;
  Mark: ComponentType<SVGProps<SVGSVGElement>>;
}

export const DNS_PROVIDERS: DnsProviderBrand[] = [
  { id: "godaddy", name: "GoDaddy", match: /godaddy/i, color: "#1BDBDB", foreground: "#111111", Mark: GoDaddyMark },
  { id: "cloudflare", name: "Cloudflare", match: /cloudflare/i, color: "#F38020", foreground: "#ffffff", Mark: CloudflareMark },
  { id: "ionos", name: "IONOS", match: /ionos|1&1|1und1/i, color: "#003D8F", foreground: "#ffffff", Mark: IonosMark },
  { id: "namecheap", name: "Namecheap", match: /namecheap/i, color: "#DE3723", foreground: "#ffffff", Mark: NamecheapMark },
  { id: "plesk", name: "Plesk", match: /plesk/i, color: "#52BBE6", foreground: "#111111", Mark: PleskMark },
  { id: "squarespace", name: "Squarespace", match: /squarespace/i, color: "#000000", foreground: "#ffffff", Mark: SquarespaceMark },
  { id: "wix", name: "Wix", match: /wix/i, color: "#0C6EFC", foreground: "#ffffff", Mark: WixMark },
  { id: "porkbun", name: "Porkbun", match: /porkbun/i, color: "#EF7878", foreground: "#111111", Mark: PorkbunMark },
  { id: "vercel", name: "Vercel", match: /vercel/i, color: "#000000", foreground: "#ffffff", Mark: VercelMark },
];

/** Match a discovery providerDisplayName to a brand; null → neutral fallback. */
export function resolveDnsProvider(name: string | undefined): DnsProviderBrand | null {
  if (!name) return null;
  return DNS_PROVIDERS.find((p) => p.match.test(name)) ?? null;
}

export function ProviderLogo({
  provider,
  className = "size-4",
}: {
  provider: DnsProviderBrand;
  className?: string;
}) {
  const Mark = provider.Mark;
  return <Mark className={className} />;
}

/**
 * Brand-colored call-to-action for the Domain Connect handoff.
 * Unknown providers render the neutral primary button instead — never
 * guess a brand.
 */
export function ProviderButton({
  provider,
  label,
  disabled = false,
  onClick,
}: {
  provider: DnsProviderBrand | null;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const brand = provider
    ? { backgroundColor: provider.color, color: provider.foreground }
    : undefined;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={brand}
      className={`inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium ring-1 ring-inset ring-white/10 transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${
        provider ? "" : "bg-primary text-primary-foreground"
      }`}
    >
      {provider ? <ProviderLogo provider={provider} /> : null}
      {label}
      <ArrowUpRight className="size-3.5 opacity-70" />
    </button>
  );
}
