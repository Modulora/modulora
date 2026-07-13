import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { DnsRecordCard } from "./domain-verify";

const record = {
  type: "TXT",
  name: "_modulora.makerlabs.dev",
  value: "modulora-verify=6f79acfee9ae420db7960df5facbd9c0",
} as const;

const meta = {
  title: "Domain/DnsRecordCard",
  component: DnsRecordCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DnsRecordCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  args: { record: { ...record, status: "pending" } },
};

export const Verified: Story = {
  args: { record: { ...record, status: "valid" } },
};

export const WithIssue: Story = {
  args: {
    record: {
      ...record,
      status: "invalid",
      issue: "A TXT record was found but its value doesn't match — update it, then Verify again.",
    },
  },
};
