import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { OwnedTray, PurchasesEmptyState, PurchasesList } from "./owned";
import { buildAgentPrompt } from "@/lib/agent-prompt";
import type { OwnedComponent } from "@/lib/purchases";

const meta = { title: "Money/Owned" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const licenseText = `Modulora Commercial License v1

Upon purchase, the seller grants you (the buyer) a non-exclusive, perpetual,
worldwide license to use, modify, and incorporate this component's source code
in any number of projects you own or build for clients.`;

const owned: OwnedComponent = {
  id: "p1",
  namespace: "maker",
  name: "live-counter",
  title: "Live Counter",
  description: "An animated counter that ticks in real time.",
  amount: 2900,
  purchasedAt: new Date(Date.now() - 3 * 86400e3).toISOString(),
  licenseTemplate: "modulora-commercial-v1",
  licenseText,
  licenseAcceptedAt: new Date(Date.now() - 3 * 86400e3).toISOString(),
};

const second: OwnedComponent = {
  ...owned,
  id: "p2",
  name: "command-palette",
  title: "Command Palette",
  description: "A fuzzy-search command palette.",
  amount: 4900,
};

export const OwnedTrayStory: Story = {
  name: "OwnedTray (detail page)",
  render: () => (
    <div className="w-[36rem]">
      <OwnedTray owned={owned} />
    </div>
  ),
};

export const Library: Story = {
  name: "PurchasesList",
  render: () => (
    <div className="w-[48rem]">
      <PurchasesList purchases={[owned, second]} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="w-[48rem]">
      <PurchasesEmptyState />
    </div>
  ),
};

export const AgentPrompt: Story = {
  name: "Agent prompt (contents)",
  render: () => (
    <pre className="w-[40rem] whitespace-pre-wrap rounded-xl border border-border/60 bg-card/35 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
      {buildAgentPrompt({ namespace: "maker", name: "live-counter", title: "Live Counter", description: "An animated counter that ticks in real time.", owned: true, publicRepoPolicy: "forbidden" })}
    </pre>
  ),
};
