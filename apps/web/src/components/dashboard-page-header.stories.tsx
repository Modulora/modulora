import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { HiBeaker as FlaskConical, HiPlus as Plus } from "react-icons/hi2";


import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "./dashboard-page-header";

const meta = {
  title: "Dashboard/PageHeader",
  component: DashboardPageHeader,
  parameters: { layout: "centered" },
  decorators: [(Story) => <div className="w-[44rem] max-w-full"><Story /></div>],
  args: {
    title: "Collections",
    description: "Group your components into installable kits. Each member remains digest-verified on its own.",
  },
} satisfies Meta<typeof DashboardPageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    action: <Button size="sm"><Plus /> New collection</Button>,
  },
};

export const WithIcon: Story = {
  args: {
    title: "Labs",
    description: "Features roll out in stages: off, early access, then everyone.",
    icon: FlaskConical,
  },
};
