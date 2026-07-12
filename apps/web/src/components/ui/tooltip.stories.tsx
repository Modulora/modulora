import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";
import { Button } from "./button";

const meta = { title: "UI/Tooltip", component: Tooltip, tags: ["autodocs"] } satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Ownership verified via GitHub sign-in.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
