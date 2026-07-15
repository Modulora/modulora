import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { withRouter } from "../../.storybook/with-router";
import { ToolListingEditor } from "./tool-listing-editor";

const meta = { title: "Publishing/ToolListingEditor", component: ToolListingEditor, parameters: { layout: "padded" }, decorators: [(Story) => withRouter(Story)], args: { onInspect: async () => ({ ok: true, metadata: { canonicalUrl: "https://example.com", title: "Example design tool", description: "A focused tool for creating accessible interface palettes.", imageUrl: null } }), onSubmit: async () => ({ ok: true }), onSubmitted: async () => {}, onCreateDomain: async (domain) => ({ ok: true, record: { domain, token: "example-token", verified: false } }), onVerifyDomain: async () => ({ ok: true, verified: true }), onDiscoverDomainConnect: async () => ({ supported: false }) } } satisfies Meta<typeof ToolListingEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
