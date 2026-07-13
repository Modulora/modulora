import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { EarningsBreakdown, LicensePicker, PriceSeal, PromotedBadge } from "./money";

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

export const Seals: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <PriceSeal paid={false} />
      <PriceSeal paid label="$19" />
      <PriceSeal paid />
      <PriceSeal size="md" paid label="$49" />
      <PriceSeal size="md" paid label="on maker.dev" />
    </div>
  ),
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

/** Promoted marks paid placement, never trust. Both tones, in context on a mock card. */
export const Promoted: Story = {
  render: () => (
    <div className="flex gap-6">
      {(["amber", "neutral"] as const).map((tone) => (
        <div key={tone} className="relative w-64 rounded-xl border border-border/60 bg-card/40 p-2 ring-1 ring-border">
          <PromotedBadge tone={tone} />
          <div className="flex h-36 items-center justify-center rounded-lg border border-border/50 bg-background text-sm text-muted-foreground">
            preview
          </div>
          <div className="flex items-center justify-between px-2 py-2">
            <div>
              <p className="text-sm font-medium">countertest</p>
              <p className="text-xs text-muted-foreground">by maker · Layout</p>
            </div>
            <PriceSeal paid={false} />
          </div>
        </div>
      ))}
    </div>
  ),
};
