import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { SimilarityStatusPanel } from "./similarity-status";
import { SIMILARITY_CORPUS_LIMITATION } from "@/lib/similarity-core";

const meta = {
  title: "Trust/SimilarityStatus",
  component: SimilarityStatusPanel,
  tags: ["autodocs"],
  args: { state: "clear", corpusLimitation: SIMILARITY_CORPUS_LIMITATION },
} satisfies Meta<typeof SimilarityStatusPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

const candidates = [
  {
    ref: "@northstar/calendar",
    confidence: "high",
    files: [
      { path: "components/ui/calendar.tsx", candidatePath: "components/ui/calendar.tsx", score: 0.94 },
      {
        path: "components/ui/date-utils.ts",
        candidatePath: "lib/date-utils.ts",
        score: 0.71,
        candidateContent: `export function toLocalDate(value: string) {\n  return new Date(value + "T00:00:00")\n}\n`,
        submittedContent: `export function toLocalDate(value: string) {\n  return new Date(\`${"${value}"}T00:00:00\`)\n}\n`,
      },
    ],
  },
];

export const Clear: Story = {};
export const PotentialMatch: Story = {
  args: { state: "potential", candidates: [{ ...candidates[0]!, confidence: "potential" }] },
};
export const Blocked: Story = { args: { state: "blocked", candidates } };
export const BlockedTritanopia: Story = { args: { state: "blocked", candidates, themeId: "pierre-dark-tritanopia" } };
export const AuthorizedDerivative: Story = { args: { state: "authorized-derivative", candidates } };
export const UnderDispute: Story = { args: { state: "under-dispute" } };
export const Takedown: Story = { args: { state: "takedown" } };
