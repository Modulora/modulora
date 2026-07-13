/**
 * Privacy Policy and Terms of Service content. Plain-language starting points —
 * not legal advice. Have counsel review before public launch. Bump the version
 * date when the text materially changes.
 */
export interface LegalSection {
  title: string;
  body: string[];
}

export const LEGAL_VERSION = "2026-07-12";

export const PRIVACY_POLICY: LegalSection[] = [
  {
    title: "What we collect",
    body: [
      "Account data you provide: email, username, and optional profile fields (name, bio, avatar, website, GitHub/X links).",
      "Data from connected accounts (GitHub, X) used only to sign you in and verify your handle — we store your username and basic profile, not your posts or messages.",
      "Content you publish: component source, demos, metadata, and provenance links.",
      "Operational data: authentication sessions, and minimal request/error logs needed to run and secure the service.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "To operate the registry: authenticate you, publish and display your components, and let others discover and install them.",
      "To verify identity claims you choose to make (GitHub/X handle, domain ownership) — always scoped to what the check actually proves.",
      "To keep the platform safe: curation review, secret scanning, and abuse prevention.",
      "We do not sell your personal data, and we never sell trust, ranking, or moderation outcomes.",
    ],
  },
  {
    title: "Sharing",
    body: [
      "Public by design: your profile, published components, and the identity indicators you enable are visible to everyone.",
      "Service providers process data on our behalf (database, email delivery, hosting/CDN, the preview sandbox) under confidentiality obligations.",
      "We disclose data if legally required, or to protect the rights and safety of users and the public.",
    ],
  },
  {
    title: "Your choices and rights",
    body: [
      "Edit or remove profile fields, disconnect social accounts, and delete your account at any time from settings.",
      "Deleting your account removes your components and profile from the platform; installs others already made are outside our control.",
      "Contact us to access, correct, or export your personal data.",
    ],
  },
  {
    title: "Retention and security",
    body: [
      "We keep data while your account is active and as needed to operate the service and meet legal obligations, then delete or anonymize it.",
      "Secrets are stored encrypted; the preview sandbox runs untrusted code on an isolated origin to protect your session.",
    ],
  },
];

export const TERMS_OF_SERVICE: LegalSection[] = [
  {
    title: "Using Modulora",
    body: [
      "Modulora is a provenance-first registry for publishing and installing UI components. You must be able to form a binding contract to use it.",
      "You are responsible for your account and for activity under it. Keep your credentials secure.",
    ],
  },
  {
    title: "Your content",
    body: [
      "You keep ownership of everything you publish, under the license you set. Consumers install under that license.",
      "You grant Modulora a non-exclusive right to host, display, index, and distribute your submissions so the registry can function.",
      "Publishing is also governed by the Publishing Policy, which is incorporated into these terms.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "No malicious, deceptive, infringing, or illegal content. No attempts to break isolation, exfiltrate data, or abuse other users.",
      "Do not misrepresent identity, provenance, or the scoped evidence shown on listings.",
      "We may review, unlist, remove content, or suspend accounts that violate these terms.",
    ],
  },
  {
    title: "Payments and creator earnings",
    body: [
      "Free components, public profiles, open-source code, and installs remain free.",
      "Where paid features or creator earnings apply, specific commercial terms will be presented before you opt in.",
      "Paid components sold on Modulora are licensed under terms set by the seller and accepted by the buyer at checkout. That license is a contract between buyer and seller: Modulora records the agreement (what was accepted and when) and facilitates payment, but is not a party to the license and is not responsible for enforcing it.",
      "We support sellers in a license dispute with documentation of the sale and the recorded agreement, but resolution is between the parties.",
    ],
  },
  {
    title: "Disclaimers and liability",
    body: [
      "The service and all listed components are provided \"as is.\" Curation review is not a safety guarantee — review code before you run it.",
      "To the fullest extent permitted by law, Modulora is not liable for indirect or consequential damages arising from use of the service or installed components.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update these terms; material changes will be dated and, where appropriate, require renewed acceptance. Continued use means you accept the current terms.",
    ],
  },
];
