import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { withRouter } from "../../.storybook/with-router";
import { ToolListingDetail } from "./tool-listing-detail";

const meta = {
  title: "Catalog/ToolListingDetail",
  component: ToolListingDetail,
  decorators: [(Story) => withRouter(Story)],
  parameters: { layout: "fullscreen" },
  args: {
    item: {
      schemaVersion: "0",
      namespace: "maker",
      name: "contrast-workbench",
      version: "1.0.0",
      framework: "web",
      sourceModel: "external-site",
      visibility: "public",
      owner: { kind: "user", identifier: "maker" },
      license: { kind: "custom", url: "https://example.com" },
      title: "Contrast Workbench",
      description: "A focused visual tool for comparing interface colors and checking readable combinations.",
      category: "Utilities",
      listingKind: "tool",
      site: { url: "https://example.com", domain: "example.com", ogTitle: "Contrast Workbench", ogDescription: "Compare interface colors.", ogImageUrl: null },
      evidence: [{ type: "domain-verified", status: "passed", issuer: "modulora-platform", timestamp: new Date().toISOString() }],
    },
  },
} satisfies Meta<typeof ToolListingDetail>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
