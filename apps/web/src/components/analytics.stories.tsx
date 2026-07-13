import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { AnalyticsEmptyState, AnalyticsTable, AnalyticsTotals } from "./analytics";

const meta = { title: "Money/Analytics" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const components = [
  { name: "command-palette", title: "Command Palette", reviewStatus: "approved", views: 1284, verifiedInstalls: 231, sales: 12 },
  { name: "live-counter", title: "Live Counter", reviewStatus: "approved", views: 402, verifiedInstalls: 58, sales: 4 },
  { name: "pricing-table", title: "Pricing Table", reviewStatus: "pending", views: 0, verifiedInstalls: 0, sales: 0 },
];
const totals = {
  views: components.reduce((s, c) => s + c.views, 0),
  verifiedInstalls: components.reduce((s, c) => s + c.verifiedInstalls, 0),
  sales: components.reduce((s, c) => s + c.sales, 0),
};

export const WithData: Story = {
  render: () => (
    <div className="flex w-[52rem] flex-col gap-6">
      <AnalyticsTotals totals={totals} />
      <AnalyticsTable components={components} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="flex w-[52rem] flex-col gap-6">
      <AnalyticsTotals totals={{ views: 0, verifiedInstalls: 0, sales: 0 }} />
      <AnalyticsEmptyState />
    </div>
  ),
};
