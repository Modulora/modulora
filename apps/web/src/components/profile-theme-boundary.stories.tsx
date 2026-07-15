import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { ProfileThemeBoundary } from "./profile-theme-boundary";

const meta = {
  title: "Profile/ThemeBoundary",
  component: ProfileThemeBoundary,
  parameters: { layout: "fullscreen" },
  args: {
    font: "space-grotesk",
    lightTheme: { background: "#f7f3ff", foreground: "#24143d", card: "#ffffff", "card-foreground": "#24143d", border: "#d9cbea", radius: "1rem" },
    darkTheme: { background: "#160d24", foreground: "#f6efff", card: "#221435", "card-foreground": "#f6efff", border: "#493463", radius: "1rem" },
    children: (
      <div className="p-8">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-xl font-semibold">Customized public profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">Theme variables stay scoped to this boundary.</p>
        </div>
      </div>
    ),
  },
} satisfies Meta<typeof ProfileThemeBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Customized: Story = {};
