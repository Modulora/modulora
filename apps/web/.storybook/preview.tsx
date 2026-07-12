import type { Preview } from "@storybook/tanstack-react";
import "../src/styles.css";

/** Render stories on Modulora's dark surface with the app's tokens/fonts. */
const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: { test: "todo" },
  },
  decorators: [
    (Story) => (
      <div className="dark min-h-24 bg-background p-8 text-foreground">
        <Story />
      </div>
    ),
  ],
};

export default preview;
