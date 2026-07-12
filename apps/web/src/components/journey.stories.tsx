import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { JourneyChecklist } from "./journey";

const meta = { title: "Money/Journey" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const wrap = (children: React.ReactNode) => <div className="w-[36rem]">{children}</div>;

export const Fresh: Story = {
  render: () => wrap(<JourneyChecklist journey={{ published: false, approved: false, payouts: false, priced: false }} />),
};

export const InReview: Story = {
  render: () => wrap(<JourneyChecklist journey={{ published: true, approved: false, payouts: false, priced: false }} />),
};

export const ReadyToSell: Story = {
  render: () => wrap(<JourneyChecklist journey={{ published: true, approved: true, payouts: true, priced: false }} />),
};
