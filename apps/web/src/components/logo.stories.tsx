import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Logo } from "./logo";

const meta = { title: "Brand/Logo", component: Logo, tags: ["autodocs"] } satisfies Meta<typeof Logo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { className: "size-10 text-foreground" } };
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-foreground">
      <Logo className="size-6" />
      <Logo className="size-10" />
      <Logo className="size-16" />
    </div>
  ),
};
