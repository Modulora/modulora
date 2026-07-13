import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { NotFound } from "./not-found";

const meta = {
  title: "Layout/NotFound",
  component: NotFound,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof NotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
