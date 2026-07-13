import type { StorybookConfig } from '@storybook/tanstack-react';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  "framework": "@storybook/tanstack-react",
  // Storybook renders in a browser, not the Workers runtime. Strip the
  // Cloudflare + TanStack Start server plugins that the app's Vite config pulls
  // in (their runner-worker breaks Storybook's preview build).
  async viteFinal(config) {
    const drop = ["cloudflare", "tanstack-start", "nitro", "vite-plugin-cloudflare"];
    const keep = (plugin: unknown): boolean => {
      const name = plugin && typeof plugin === "object" && "name" in plugin ? String((plugin as { name?: string }).name ?? "") : "";
      return !drop.some((d) => name.includes(d));
    };
    config.plugins = (config.plugins ?? []).map((p) => (Array.isArray(p) ? p.filter(keep) : p)).filter(keep);
    return config;
  },
};
export default config;