import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["default", "secondary", "destructive", "outline"] },
  },
  args: { children: "Badge", variant: "default" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: "secondary", children: "Free" } };
export const Outline: Story = { args: { variant: "outline", children: "$29 one-time" } };

export const All: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Free</Badge>
      <Badge variant="outline">$29 one-time</Badge>
      <Badge variant="destructive">Rejected</Badge>
    </div>
  ),
};
