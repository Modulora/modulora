import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { ProfileCustomizationEditor } from "./profile-customization-editor";

const theme = `:root {
  --background: #faf7ff;
  --foreground: #24143d;
  --card: #ffffff;
  --card-foreground: #24143d;
  --border: #d9cbea;
  --radius: 1rem;
}
.dark {
  --background: #160d24;
  --foreground: #f6efff;
  --card: #221435;
  --card-foreground: #f6efff;
  --border: #493463;
}`;

const meta = {
  title: "Profile/CustomizationEditor",
  component: ProfileCustomizationEditor,
  parameters: { layout: "padded" },
  args: {
    isPlus: true,
    initialFont: "space-grotesk",
    initialThemeCss: theme,
    initialLightTheme: {},
    initialDarkTheme: {},
    initialBackgroundImage: null,
    initialBackgroundOverlay: "dark",
    initialBackgroundOverlayOpacity: 35,
    initialBackgroundPositionX: 50,
    initialBackgroundPositionY: 50,
    onSave: async () => ({ ok: true }),
  },
} satisfies Meta<typeof ProfileCustomizationEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plus: Story = {};
export const LapsedPlus: Story = { args: { isPlus: false } };
