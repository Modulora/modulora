import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { PreviewToolbar, type PreviewViewport } from "./preview-toolbar";

const meta = {
  title: "Editor/PreviewToolbar",
  component: PreviewToolbar,
  tags: ["autodocs"],
  args: { theme: "dark", onTheme: () => {}, viewport: "desktop", onViewport: () => {}, onRefresh: () => {}, onFullscreen: () => {} },
} satisfies Meta<typeof PreviewToolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => {
    const [theme, setTheme] = useState<"light" | "dark">("dark");
    const [viewport, setViewport] = useState<PreviewViewport>("desktop");
    return (
      <PreviewToolbar
        theme={theme}
        onTheme={setTheme}
        viewport={viewport}
        onViewport={setViewport}
        onRefresh={() => {}}
        onFullscreen={() => {}}
      />
    );
  },
};
