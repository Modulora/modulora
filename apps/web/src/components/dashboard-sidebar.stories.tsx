import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { withRouter } from "../../.storybook/with-router";
import type { StudioSummary } from "@/lib/studio";
import { DashboardSidebar } from "./dashboard-sidebar";

const summary: StudioSummary = {
  user: { name: "Maker", username: "maker", image: null },
  namespace: "maker",
  counts: { components: 9, libraries: 0, verifiedInstalls: 42 },
  roles: { curator: true, owner: true },
  journey: { published: true, approved: true, payouts: true, priced: true },
};

const meta = {
  title: "Dashboard/Sidebar",
  component: DashboardSidebar,
  decorators: [(Story) => withRouter(Story)],
  args: { summary },
} satisfies Meta<typeof DashboardSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  decorators: [(Story) => <div className="w-64"><Story /></div>],
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  decorators: [(Story) => <div className="w-[22rem] max-w-full"><Story /></div>],
};
