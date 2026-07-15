import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { ExternalSitePreview } from "./external-site-preview";

const meta = {
  title: "Tools/ExternalSitePreview",
  component: ExternalSitePreview,
  args: {
    url: "https://shieldcn.dev",
    title: "Live preview of Shieldcn",
    imageAlt: "Shieldcn Open Graph preview",
    className: "h-[28rem] w-[48rem] border border-border",
  },
} satisfies Meta<typeof ExternalSitePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImageFallback: Story = {
  args: {
    imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='675'%3E%3Crect width='1200' height='675' fill='%23171717'/%3E%3Ctext x='600' y='338' text-anchor='middle' dominant-baseline='middle' fill='%23fafafa' font-family='Arial' font-size='54'%3EOpen Graph preview%3C/text%3E%3C/svg%3E",
  },
};

export const WithoutImageFallback: Story = {
  args: { imageUrl: null },
};

export const Mobile: Story = {
  args: {
    className: "h-[30rem] w-[22rem] border border-border",
    imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='675'%3E%3Crect width='1200' height='675' fill='%23171717'/%3E%3Ctext x='600' y='338' text-anchor='middle' dominant-baseline='middle' fill='%23fafafa' font-family='Arial' font-size='54'%3EOpen Graph preview%3C/text%3E%3C/svg%3E",
  },
};
