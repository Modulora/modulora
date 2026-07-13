import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Button } from "@/components/ui/button";
import { NewListDialog } from "./new-list-dialog";

const meta = {
  title: "Lists/NewListDialog",
  component: NewListDialog,
  parameters: { layout: "centered" },
} satisfies Meta<typeof NewListDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ busy = false }: { busy?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>New list…</Button>
      <NewListDialog
        open={open}
        onOpenChange={setOpen}
        busy={busy}
        onCreate={() => setOpen(false)}
      />
    </>
  );
}

export const Default: Story = {
  args: { open: true, onOpenChange: () => {}, onCreate: () => {} },
  render: () => <Demo />,
};

export const Creating: Story = {
  args: { open: true, onOpenChange: () => {}, onCreate: () => {}, busy: true },
  render: () => <Demo busy />,
};
