import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "./button";

const meta = { title: "UI/Dialog", component: Dialog, tags: ["autodocs"] } satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete component?</DialogTitle>
          <DialogDescription>This permanently removes @maker/live-counter and all its versions. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button variant="destructive" size="sm">Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  ),
};
