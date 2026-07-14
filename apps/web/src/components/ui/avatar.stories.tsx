import type { Meta, StoryObj } from "@storybook/tanstack-react";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: {
    size: "lg",
    children: (
      <>
        <AvatarImage src="/logo.png" alt="" className="object-cover" />
        <AvatarFallback>JL</AvatarFallback>
      </>
    ),
  },
};

export const Fallback: Story = {
  args: {
    size: "lg",
    children: <AvatarFallback>JL</AvatarFallback>,
  },
};

export const BrokenImageFallback: Story = {
  args: {
    size: "lg",
    children: (
      <>
        <AvatarImage src="/missing-avatar.png" alt="" />
        <AvatarFallback>JL</AvatarFallback>
      </>
    ),
  },
};
