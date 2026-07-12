import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { CodeThemePicker } from "./code-theme-picker";

const meta = {
  title: "Editor/CodeThemePicker",
  component: CodeThemePicker,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { value: "github-dark-default", onChange: () => {} },
} satisfies Meta<typeof CodeThemePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => {
    const [theme, setTheme] = useState("github-dark-default");
    return (
      <div className="w-80">
        <CodeThemePicker value={theme} onChange={setTheme} />
        <p className="mt-3 font-mono text-xs text-muted-foreground">selected: {theme}</p>
      </div>
    );
  },
};

export const StartingOnDracula: Story = {
  render: () => {
    const [theme, setTheme] = useState("dracula");
    return (
      <div className="w-80">
        <CodeThemePicker value={theme} onChange={setTheme} />
      </div>
    );
  },
};
