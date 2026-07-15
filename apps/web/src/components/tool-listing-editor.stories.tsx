import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { withRouter } from "../../.storybook/with-router";
import { ToolListingEditor } from "./tool-listing-editor";

const previewImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='675'%3E%3Crect width='1200' height='675' fill='%23171717'/%3E%3Ctext x='600' y='338' text-anchor='middle' dominant-baseline='middle' fill='%23fafafa' font-family='Arial' font-size='54'%3EShieldcn preview%3C/text%3E%3C/svg%3E";

const meta = {
  title: "Publishing/ToolListingEditor",
  component: ToolListingEditor,
  parameters: { layout: "padded" },
  decorators: [(Story) => withRouter(Story)],
  args: {
    onInspect: async () => ({
      ok: true,
      metadata: {
        canonicalUrl: "https://shieldcn.dev",
        title: "Shieldcn",
        description: "Beautiful GitHub README badges and charts styled as shadcn/ui, plus a visual README builder.",
        imageUrl: previewImage,
      },
    }),
    onSubmit: async () => ({ ok: true }),
    onSubmitted: async () => {},
    onCreateDomain: async (domain) => ({ ok: true, record: { domain, token: "example-token", verified: false } }),
    onVerifyDomain: async () => ({ ok: true, verified: true }),
    onDiscoverDomainConnect: async () => ({ supported: false }),
  },
} satisfies Meta<typeof ToolListingEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
