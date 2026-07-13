/**
 * Feature flags — the "early access" Plus benefit made real. A flag rolls
 * out in stages: off → plus-early (Plus subscribers get it first) →
 * everyone. The registry is code (reviewable, versioned); no remote-config
 * mystery. Flags gate features, never rank/trust/moderation.
 */
import type { CurrentUser } from "./session";

export type FlagStage = "off" | "plus-early" | "everyone";

export interface FeatureFlag {
  key: string;
  title: string;
  description: string;
  stage: FlagStage;
}

export const FLAGS: FeatureFlag[] = [
  {
    key: "profile-card-export",
    title: "Exportable profile card",
    description: "An interactive card of your profile — export it and share to X.",
    stage: "off",
  },
  {
    key: "deep-analytics",
    title: "Deeper analytics",
    description: "Time-series charts for views, installs, and sales.",
    stage: "off",
  },
  {
    key: "labs",
    title: "Labs",
    description: "This page — see what's rolling out and get features early with Plus.",
    stage: "everyone",
  },
];

export function hasFeature(user: Pick<CurrentUser, "isPlus"> | null, key: string): boolean {
  const flag = FLAGS.find((f) => f.key === key);
  if (!flag) return false;
  if (flag.stage === "everyone") return true;
  if (flag.stage === "plus-early") return Boolean(user?.isPlus);
  return false;
}
