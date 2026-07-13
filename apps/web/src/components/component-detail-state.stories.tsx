import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { ComponentDetailError, ComponentDetailLoading } from "./component-detail-state";

const meta = {
  title: "Components/DetailStates",
  component: ComponentDetailLoading,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ComponentDetailLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

export const RouteError = {
  render: () => <ComponentDetailError error={new Error("The registry request timed out.")} reset={() => undefined} info={{ componentStack: "" }} />,
};
