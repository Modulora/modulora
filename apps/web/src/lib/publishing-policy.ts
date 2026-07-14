/**
 * Publishing policy shown at /publishing-policy and acknowledged before every
 * submission. Bump POLICY_VERSION when the terms change to require re-consent.
 * This is a plain-language operating policy, not legal advice.
 */
export const POLICY_VERSION = "2026-07-13";

export interface PolicySection {
  title: string;
  points: string[];
}

export const PUBLISHING_POLICY: PolicySection[] = [
  {
    title: "You have the right to publish it",
    points: [
      "You wrote the code, or you have the right to distribute it under the license you set.",
      "You will not upload code you don't have permission to share, or that infringes someone's copyright, trademark, or other rights.",
      "Provenance links (original source, inspired-by) are accurate and not misleading.",
    ],
  },
  {
    title: "Licensing and distribution",
    points: [
      "You choose your component's license; consumers install it under that license. Modulora does not change it.",
      "You grant Modulora the right to host, display, index, and distribute your submission (and its preview/demo) so people can discover and install it.",
      "You can remove your component at any time; cached installs already made by others are outside our control.",
    ],
  },
  {
    title: "No harmful or deceptive code",
    points: [
      "No malware, backdoors, obfuscated payloads, crypto miners, or code designed to exfiltrate data or credentials.",
      "No hardcoded secrets, tokens, or keys. The install must deliver exactly the reviewed files — nothing runs install scripts on the consumer's machine.",
      "No content that is illegal, hateful, or intended to harass or deceive.",
    ],
  },
  {
    title: "Curation and enforcement",
    points: [
      "Every submission is reviewed by a curator before it is publicly listed. Review is not a safety guarantee — you remain responsible for your code.",
      "Modulora may reject, unlist, or remove any submission that violates this policy, and may suspend accounts for repeated or serious violations.",
      "Evidence shown on your listing (integrity digest, install parity, secret scan) is scoped and honest; do not represent it as more than it is.",
    ],
  },
  {
    title: "Paid components",
    points: [
      "Selling on Modulora: you set the price and the buyer license (a standard template or your own terms). Buyers must accept your license before checkout, and we record that agreement on every sale.",
      "Your license is a contract between you and the buyer. Modulora does not enforce it, but will support you with documentation of the sale and the recorded agreement if a dispute arises.",
      "You must hold the rights to everything you sell. Selling source you don't own is grounds for removal and account suspension.",
      "External paid listings (sold on your own site): you fulfill delivery and support. Modulora does not receive, scan, or review the paid source, and the listing says so. During alpha, domain verification is optional and unverified destinations are disclosed.",
    ],
  },
];
