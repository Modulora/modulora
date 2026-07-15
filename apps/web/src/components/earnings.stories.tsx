import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { EarningsActivityCharts, EarningsEmptyState, EarningsSummary, PayoutStatusPanel, ProfitSharePanel, SalesList } from "./earnings";
import type { EarningsData } from "@/lib/earnings";

const meta = { title: "Money/Earnings" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const now = Date.now();
const trend = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(now - (29 - index) * 86400e3).toISOString().slice(0, 10);
  return {
    date,
    verifiedInstalls: [0, 1, 0, 2, 1, 3][index % 6]!,
    netSales: index % 7 === 0 ? 2610 : 0,
    profitShareAccrued: index % 10 === 0 ? 420 : 0,
    profitSharePaid: index === 22 ? 2500 : 0,
  };
});
const mock: EarningsData = {
  payoutsEnabled: true,
  totalSales: 4,
  grossAmount: 10600,
  feeAmount: 1060,
  netAmount: 9540,
  verifiedInstalls: 231,
  profitShareDistributed: 0,
  profitSharePending: 1240,
  trend,
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
      <EarningsActivityCharts data={mock} />
      <SalesList sales={mock.sales} />
      <ProfitSharePanel data={mock} />
    </div>
  ),
};

export const WithDistributions: Story = {
  render: () => {
    const distributed = { ...mock, profitShareDistributed: 12750, profitSharePending: 310 };
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

export const CombinedWorkspace: Story = {
  render: () => (
    <div className="flex w-[72rem] flex-col gap-6">
      <EarningsSummary data={mock} showSales={false} />
      <EarningsActivityCharts data={mock} showSales={false} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(19rem,0.7fr)]">
        <ProfitSharePanel data={mock} />
        <PayoutStatusPanel status={{ configured: true, connected: true, payoutsEnabled: true }} accrued={mock.profitSharePending} busy={false} onSetup={() => undefined} onManage={() => undefined} />
      </div>
    </div>
  ),
};

export const PayoutAccountStates: Story = {
  render: () => (
    <div className="grid w-[64rem] grid-cols-3 gap-4">
      <PayoutStatusPanel status={{ configured: true, connected: false, payoutsEnabled: false }} accrued={800} busy={false} onSetup={() => undefined} onManage={() => undefined} />
      <PayoutStatusPanel status={{ configured: true, connected: true, payoutsEnabled: false }} accrued={1240} busy={false} onSetup={() => undefined} onManage={() => undefined} />
      <PayoutStatusPanel status={{ configured: true, connected: true, payoutsEnabled: true }} accrued={3100} busy={false} onSetup={() => undefined} onManage={() => undefined} />
    </div>
  ),
};
