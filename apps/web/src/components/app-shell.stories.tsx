import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { AppShell } from "./app-shell";
import { withRouter } from "../../.storybook/with-router";
import type { CurrentUser } from "@/lib/session";

const mockUser: CurrentUser = {
  id: "u_1",
  email: "maker@example.com",
  name: "Maker",
  image: null,
  username: "maker",
  usernameChangedAt: null,
  bio: null,
  websiteUrl: null,
  githubUrl: null,
  xUrl: null,
  githubUsername: "maker",
  xUsername: null,
  stripeAccountId: null,
  payoutsEnabled: false,
  isCurator: true,
  isPlus: true,
  editorTheme: "github-dark-default",
};

const meta = {
  title: "Layout/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => withRouter(Story)],
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const Body = () => (
  <div className="p-10 text-sm text-muted-foreground">Page content goes here.</div>
);

export const SignedIn: Story = {
  args: { user: mockUser, children: <Body /> },
};

export const SignedOut: Story = {
  args: { user: null, children: <Body /> },
};
