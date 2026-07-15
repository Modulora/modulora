import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { ToolListingImage } from "./tool-listing-image";

const meta = {
  title: "Tools/ToolListingImage",
  component: ToolListingImage,
  args: { domain: "shieldcn.dev", className: "h-72 w-[28rem] rounded-xl border border-border" },
} satisfies Meta<typeof ToolListingImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Missing: Story = { args: { src: null } };
export const Broken: Story = { args: { src: "/missing-tool-preview.png" } };
export const Loaded: Story = {
  args: {
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='675'%3E%3Crect width='1200' height='675' fill='%23171717'/%3E%3Ctext x='600' y='338' text-anchor='middle' dominant-baseline='middle' fill='%23fafafa' font-family='Arial' font-size='54'%3EShieldcn preview%3C/text%3E%3C/svg%3E",
  },
};
