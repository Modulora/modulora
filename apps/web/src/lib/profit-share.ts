/**
 * Public profit-share explainer content. Plain-language summary of the model —
 * the binding version lives in the Creator Earnings Terms (see
 * docs/profit-share-terms-outline.md → full T&C). Bump the version on change.
 */
export const PROFIT_SHARE_VERSION = "2026-07-12";

/** The headline split of distributable profit. */
export const SPLIT = { creator: 30, ossFund: 10, modulora: 60 } as const;

export interface ExplainerSection {
  title: string;
  body: string[];
}

export const PROFIT_SHARE_MODEL: ExplainerSection[] = [
  {
    title: "Two ways to earn",
    body: [
      "Direct sales: list a component, template, or page for a one-time price. You keep 90% of every sale — Modulora's 10% covers our fee and payment processing. Paid to your connected account, per sale.",
      "Profit share: your free, open components earn a share of Modulora's distributable profit based on how often they're actually installed — no listing required.",
      "Both settle to the same connected payout account you set up once.",
    ],
  },
  {
    title: "The split",
    body: [
      "Of Modulora's distributable profit for a period, 30% goes to creators, 10% to an open-source fund, and 60% is retained by Modulora to run and grow the platform.",
      "Distributable profit means revenue in the profit-share pool minus the costs of earning it — payment processing fees, infrastructure, and operating costs including salaries. It's what's left to distribute, not gross revenue.",
      "The 30% creator pool is divided among creators in proportion to their verified installs for that period. This is separate from marketplace sales, where you keep 90% of each sale directly.",
    ],
  },
  {
    title: "What counts — verified installs only",
    body: [
      "Only digest-verified installs through the Modulora CLI count toward your share. Each install receipt is tied to the exact published content hash.",
      "Page views, likes, or any number we can't independently verify never affect earnings. This is the same honesty rule as the rest of Modulora: we don't pay on things we can't prove.",
      "Installs of components that violate the publishing policy, or that we can't attribute to a real install, are excluded.",
    ],
  },
  {
    title: "Getting paid",
    body: [
      "Connect a Stripe account once (we handle verification, banking, and tax through Stripe). Earnings accrue per period and pay out on a regular cadence once you pass a minimum threshold.",
      "You keep ownership of your components and their licenses. Participating in profit share doesn't change your license or transfer your rights.",
      "Reversed payments, fraud, or policy violations can reduce or claw back the corresponding earnings.",
    ],
  },
  {
    title: "Fair and transparent",
    body: [
      "We publish the split and the definition of distributable profit, and we never sell rank, trust, or moderation — earnings can't be bought.",
      "The binding terms are the Creator Earnings Terms; this page is a plain-language summary. If they ever conflict, the Terms govern.",
    ],
  },
];
