import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { FeedbackDialog } from "./feedback-dialog";

const meta = {
  title: "Layout/FeedbackDialog",
  component: FeedbackDialog,
  parameters: { layout: "centered" },
  args: { open: true, onOpenChange: () => {}, onSubmit: () => {} },
} satisfies Meta<typeof FeedbackDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Sending: Story = { args: { busy: true } };
export const Sent: Story = { args: { done: true } };
export const Failed: Story = { args: { error: "Could not deliver feedback — try again." } };
