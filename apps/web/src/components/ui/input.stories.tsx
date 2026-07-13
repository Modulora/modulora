import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Input } from "./input";

const meta = { title: "UI/Input", component: Input, tags: ["autodocs"], args: { placeholder: "yoursite.com" } } satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true, value: "modulora.dev" } };
export const Password: Story = { args: { type: "password", placeholder: "••••••••" } };
