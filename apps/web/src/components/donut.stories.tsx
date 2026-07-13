import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Donut } from "./donut";

const meta = {
  title: "Charts/Donut",
  component: Donut,
  tags: ["autodocs"],
} satisfies Meta<typeof Donut>;

export default meta;
type Story = StoryObj<typeof meta>;

const SPLIT = [
  { label: "Creators", value: 30, color: "#10b981" },
  { label: "Open-source fund", value: 10, color: "#f59e0b" },
  { label: "Modulora", value: 60, color: "#52525b" },
];

export const ProfitShareSplit: Story = {
  args: {
    segments: SPLIT,
    size: 200,
    center: (
      <>
        <span className="text-2xl font-bold">100%</span>
        <span className="mt-0.5 max-w-[7rem] text-[10px] leading-tight text-muted-foreground">of distributable profit</span>
      </>
    ),
  },
};

export const TwoWay: Story = {
  args: {
    segments: [
      { label: "You", value: 90, color: "#10b981" },
      { label: "Modulora", value: 10, color: "#52525b" },
    ],
    size: 180,
    center: <span className="text-xl font-bold">90%</span>,
  },
};
