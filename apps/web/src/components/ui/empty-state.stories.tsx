import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Banknote, Bookmark, SearchX } from "lucide-react";

import { Button } from "./button";
import { EmptyState } from "./empty-state";

const meta = {
  title: "UI/EmptyState",
  component: EmptyState,
  parameters: { layout: "centered" },
  args: {
    icon: SearchX,
    title: "No components match",
    description: "Try another category or clear the active filters.",
    className: "w-[32rem]",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    icon: Bookmark,
    title: "Nothing saved yet",
    description: "Save a component and it will appear here.",
    action: <Button size="sm">Browse components</Button>,
  },
};

export const Earnings: Story = {
  args: {
    icon: Banknote,
    title: "No sales yet",
    description: "Connect payouts, then set a price on one of your components.",
  },
};
