import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { DashboardLoading, DashboardRouteError } from "./dashboard-route-state";

const meta = {
  title: "Dashboard/RouteStates",
  component: DashboardLoading,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DashboardLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

export const RouteError = {
  render: () => <DashboardRouteError error={new Error("The dashboard data request timed out.")} reset={() => undefined} info={{ componentStack: "" }} />,
};
