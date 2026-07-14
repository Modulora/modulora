import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { Label } from "./label";
import { Switch } from "./switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
  args: { "aria-label": "Show section" },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };

export const Labeled: Story = {
  render: function LabeledSwitch() {
    const [checked, setChecked] = useState(true);
    return (
      <div className="flex min-h-11 w-80 items-center justify-between gap-4 rounded-lg border border-border/60 px-3">
        <Label htmlFor="story-switch" className="flex min-h-11 flex-1 cursor-pointer items-center">
          Show components
        </Label>
        <Switch id="story-switch" checked={checked} onCheckedChange={setChecked} />
      </div>
    );
  },
};
