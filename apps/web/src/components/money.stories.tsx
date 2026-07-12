import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { EarningsBreakdown, LicensePicker } from "./money";

const meta = { title: "Money/SellDialog" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Breakdown: Story = {
  render: () => {
    const [dollars, setDollars] = useState("29");
    return (
      <div className="flex w-80 flex-col gap-3">
        <input
          value={dollars}
          onChange={(e) => setDollars(e.target.value.replace(/[^0-9.]/g, ""))}
          className="h-9 rounded-md border border-border/60 bg-transparent px-3 text-sm outline-none"
          placeholder="Price in dollars"
        />
        <EarningsBreakdown dollars={dollars} />
      </div>
    );
  },
};

export const License: Story = {
  render: () => {
    const [template, setTemplate] = useState("modulora-commercial-v1");
    const [text, setText] = useState("");
    return (
      <div className="w-96">
        <LicensePicker template={template} setTemplate={setTemplate} text={text} setText={setText} />
      </div>
    );
  },
};
