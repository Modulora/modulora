import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "./card";
import { Button } from "./button";

const meta = { title: "UI/Card", component: Card, tags: ["autodocs"], parameters: { layout: "centered" } } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Live Counter</CardTitle>
        <CardDescription>@maker · Layout</CardDescription>
        <CardAction>
          <Button size="xs" variant="outline">Free</Button>
        </CardAction>
      </CardHeader>
      <CardContent>A small interactive counter with increment and decrement controls.</CardContent>
      <CardFooter>
        <Button size="sm">View</Button>
      </CardFooter>
    </Card>
  ),
};
