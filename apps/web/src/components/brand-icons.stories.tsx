import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { XIcon, DiscordIcon, ShadcnIcon, GitHubIcon } from "./brand-icons";

const meta = { title: "Brand/Icons", tags: ["autodocs"] } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {
  render: () => (
    <div className="flex items-center gap-6 text-foreground [&_svg]:size-6">
      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground"><GitHubIcon /> GitHub</div>
      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground"><XIcon /> X</div>
      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground"><DiscordIcon /> Discord</div>
      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground"><ShadcnIcon /> shadcn</div>
    </div>
  ),
};
