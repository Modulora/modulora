/**
 * Seller licenses for paid components. A seller picks a standard template or
 * provides custom terms; the buyer must agree before checkout, and we snapshot
 * the exact text onto the purchase row (a provable log of what was agreed).
 *
 * Enforcement stance (also stated in /terms and the publishing policy):
 * Modulora is not responsible for enforcing creator licenses. We support
 * creators with documentation of each sale, purchase + agreement logs, and
 * reasonable cooperation in a dispute.
 */

export const LICENSE_TEMPLATES = [
  {
    id: "modulora-commercial-v1",
    name: "Modulora Commercial License v1",
    summary: "Use in any number of your own projects, commercial or not. No resale or redistribution of the source as a component/template.",
    /** Redistribution is forbidden — committing the source to a public repo redistributes it. */
    publicRepos: "forbidden" as const,
    text: `Modulora Commercial License v1

Upon purchase, the seller grants you (the buyer) a non-exclusive, perpetual,
worldwide license to use, modify, and incorporate this component's source code
in any number of projects you own or build for clients, commercial or
non-commercial.

You may not: resell, sublicense, or redistribute the component's source code on
its own or as part of a component library, template, starter kit, or any
product whose primary value is the component itself; or represent the original
work as your own creation.

The component is provided "as is", without warranty of any kind. The seller's
liability is limited to the amount you paid.

This license is between you and the seller. Modulora facilitates the sale and
records this agreement but is not a party to, and does not enforce, its terms.`,
  },
  {
    id: "custom",
    name: "Custom terms",
    summary: "The seller provides their own license text.",
    /** We can't interpret custom terms — the buyer must check before publishing. */
    publicRepos: "unknown" as const,
    text: "",
  },
] as const;

export type PublicRepoPolicy = "forbidden" | "unknown" | "allowed";

/** What a purchase's license implies about committing the source publicly. */
export function publicRepoPolicy(templateId: string | null): PublicRepoPolicy {
  const t = LICENSE_TEMPLATES.find((tpl) => tpl.id === templateId);
  return t?.publicRepos ?? "unknown";
}

export type LicenseTemplateId = (typeof LICENSE_TEMPLATES)[number]["id"];

export function licenseTemplate(id: string) {
  return LICENSE_TEMPLATES.find((t) => t.id === id) ?? LICENSE_TEMPLATES[0];
}

/** The effective license text for a price row. */
export function resolveLicenseText(template: string, customText: string | null): string {
  if (template === "custom") return customText?.trim() || "";
  return licenseTemplate(template).text;
}
