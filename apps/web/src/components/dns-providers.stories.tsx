import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { OneClickSetup } from "./domain-verify";
import { DNS_PROVIDERS, ProviderButton } from "./dns-providers";

const meta = {
  title: "Domain/Providers",
  component: OneClickSetup,
  parameters: { layout: "padded" },
  args: {
    domain: "makerlabs.dev",
    provider: "GoDaddy",
    onConnect: () => {},
  },
} satisfies Meta<typeof OneClickSetup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full handoff panel with brand logo + colored CTA. */
export const OneClickGoDaddy: Story = {};

export const OneClickIonos: Story = { args: { provider: "IONOS" } };

export const OneClickConnecting: Story = { args: { connecting: true } };

export const OneClickFailed: Story = {
  args: { error: "GoDaddy rejected the authorization — try again or add the record manually." },
};

/** Unknown providers get the neutral primary button — no guessed branding. */
export const OneClickUnknownProvider: Story = { args: { provider: "Example DNS Co" } };

/** Every branded provider button, plus the neutral fallback. */
export const AllProviderButtons: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      {DNS_PROVIDERS.map((p) => (
        <ProviderButton key={p.id} provider={p} label={`Continue to ${p.name}`} onClick={() => {}} />
      ))}
      <ProviderButton provider={null} label="Continue to your DNS provider" onClick={() => {}} />
    </div>
  ),
};
