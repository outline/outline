import type { Meta, StoryObj } from "@storybook/react";
import { NotificationsCondensed } from "~/components/NotificationsCondensed";
import { NotificationsSimple } from "~/components/NotificationsSimple";
import { NotificationsWithActionsBelow } from "~/components/NotificationsWithActionsBelow";
import { NotificationsWithAvatar } from "~/components/NotificationsWithAvatar";
import { NotificationsWithButtonsBelow } from "~/components/NotificationsWithButtonsBelow";
import { NotificationsWithSplitButtons } from "~/components/NotificationsWithSplitButtons";
const meta: Meta = {
  title: "Application UI/Overlays/Notifications",
};
export default meta;
export const Condensed: StoryObj = {
  render: () => <NotificationsCondensed />,
};
export const Simple: StoryObj = {
  render: () => <NotificationsSimple />,
};
export const WithActionsBelow: StoryObj = {
  render: () => <NotificationsWithActionsBelow />,
};
export const WithAvatar: StoryObj = {
  render: () => <NotificationsWithAvatar />,
};
export const WithButtonsBelow: StoryObj = {
  render: () => <NotificationsWithButtonsBelow />,
};
export const WithSplitButtons: StoryObj = {
  render: () => <NotificationsWithSplitButtons />,
};
