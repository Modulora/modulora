import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Label } from "./label";
import { Input } from "./input";

const meta = { title: "UI/Label", component: Label, tags: ["autodocs"] } satisfies Meta<typeof Label>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="price">Price</Label>
      <Input id="price" placeholder="29" className="w-48" />
    </div>
  ),
};
