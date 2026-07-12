import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Separator } from "./separator";

const meta = { title: "UI/Separator", component: Separator, tags: ["autodocs"] } satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64 text-sm">
      <p>Provenance</p>
      <Separator className="my-3" />
      <p>Integrity</p>
    </div>
  ),
};
export const Vertical: Story = {
  render: () => (
    <div className="flex h-8 items-center gap-3 text-sm">
      <span>Free</span>
      <Separator orientation="vertical" />
      <span>React</span>
    </div>
  ),
};
