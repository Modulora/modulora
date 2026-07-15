import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { ToolImageCarousel } from "./tool-image-carousel";

const image = (label: string, color: string) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='900'%3E%3Crect width='1200' height='900' fill='${encodeURIComponent(color)}'/%3E%3Ctext x='600' y='450' text-anchor='middle' dominant-baseline='middle' fill='white' font-family='Arial' font-size='64'%3E${label}%3C/text%3E%3C/svg%3E`;

const meta = {
  title: "Tools/ToolImageCarousel",
  component: ToolImageCarousel,
  args: {
    title: "Contrast Workbench",
    domain: "example.com",
    images: [image("Overview", "#171717"), image("Editor", "#334155"), image("Report", "#0f766e")],
    className: "aspect-[4/3] w-[32rem] rounded-xl border border-border",
  },
} satisfies Meta<typeof ToolImageCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SingleImage: Story = { args: { images: [image("Overview", "#171717")] } };
export const Empty: Story = { args: { images: [] } };
