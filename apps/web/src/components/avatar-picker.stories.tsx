import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { useEffect, useState } from "react";

import { AvatarPicker } from "./avatar-picker";

const meta = {
  title: "Profile/AvatarPicker",
  component: AvatarPicker,
  parameters: { layout: "centered" },
  args: { onUpload: async () => "/avatar.webp", onUploaded: () => undefined },
  decorators: [
    (Story) => <div className="w-[360px] rounded-xl border border-border/60 bg-card p-5"><Story /></div>,
  ],
} satisfies Meta<typeof AvatarPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SavedState: Story = {
  render: () => <AvatarPickerDemo />,
};

function AvatarPickerDemo() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return (
    <div className="flex flex-col gap-4">
      {url ? <img src={url} alt="Saved avatar preview" className="size-16 rounded-full object-cover" /> : null}
      <AvatarPicker
        onUpload={async (file) => URL.createObjectURL(file)}
        onUploaded={(nextUrl) => setUrl(nextUrl)}
      />
    </div>
  );
}
