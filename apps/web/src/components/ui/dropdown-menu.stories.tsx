import type { Meta, StoryObj } from "@storybook/tanstack-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./dropdown-menu";
import { Button } from "./button";

const meta = { title: "UI/DropdownMenu", component: DropdownMenu, tags: ["autodocs"] } satisfies Meta<typeof DropdownMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">@maker</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Dashboard</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
