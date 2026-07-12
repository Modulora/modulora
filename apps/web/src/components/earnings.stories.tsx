import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { EarningsEmptyState, EarningsSummary, ProfitSharePanel, SalesList } from "./earnings";
import type { EarningsData } from "@/lib/earnings";

const meta = { title: "Money/Earnings" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const now = Date.now();
const mock: EarningsData = {
  payoutsEnabled: true,
  totalSales: 4,
  grossAmount: 10600,
  feeAmount: 1060,
  netAmount: 9540,
  verifiedInstalls: 231,
  profitShareDistributed: 0,
  sales: [
    { id: "1", componentTitle: "Live Counter", componentName: "live-counter", buyerUsername: "devon", amount: 2900, feeAmount: 290, currency: "usd", createdAt: new Date(now - 3600e3).toISOString() },
    { id: "2", componentTitle: "Command Palette", componentName: "command-palette", buyerUsername: "aria", amount: 4900, feeAmount: 490, currency: "usd", createdAt: new Date(now - 26 * 3600e3).toISOString() },
    { id: "3", componentTitle: "Live Counter", componentName: "live-counter", buyerUsername: null, amount: 2900, feeAmount: 290, currency: "usd", createdAt: new Date(now - 4 * 86400e3).toISOString() },
    { id: "4", componentTitle: "Pricing Table", componentName: "pricing-table", buyerUsername: "sam", amount: 1900, feeAmount: 190, currency: "usd", createdAt: new Date(now - 40 * 86400e3).toISOString() },
  ],
};

export const WithSales: Story = {
  render: () => (
    <div className="flex w-[56rem] flex-col gap-6">
      <EarningsSummary data={mock} />
      <SalesList sales={mock.sales} />
      <ProfitSharePanel data={mock} />
    </div>
  ),
};

export const WithDistributions: Story = {
  render: () => {
    const distributed = { ...mock, profitShareDistributed: 12750 };
    return (
      <div className="flex w-[56rem] flex-col gap-6">
        <EarningsSummary data={distributed} />
        <ProfitSharePanel data={distributed} />
      </div>
    );
  },
};

export const EmptyPayoutsReady: Story = {
  render: () => (
    <div className="flex w-[52rem] flex-col gap-6">
      <EarningsSummary data={{ ...mock, totalSales: 0, grossAmount: 0, feeAmount: 0, netAmount: 0, verifiedInstalls: 12, sales: [] }} />
      <EarningsEmptyState payoutsEnabled />
      <ProfitSharePanel data={{ ...mock, verifiedInstalls: 12 }} />
    </div>
  ),
};

export const EmptyNoPayouts: Story = {
  render: () => (
    <div className="w-[52rem]">
      <EarningsEmptyState payoutsEnabled={false} />
    </div>
  ),
};
