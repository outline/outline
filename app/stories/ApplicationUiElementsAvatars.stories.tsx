import type { Meta, StoryObj } from "@storybook/react";
import { AvatarsAvatarGroupStackedBottomToTop } from "~/components/AvatarsAvatarGroupStackedBottomToTop";
import { AvatarsAvatarGroupStackedTopToBottom } from "~/components/AvatarsAvatarGroupStackedTopToBottom";
import { AvatarsCircularAvatars } from "~/components/AvatarsCircularAvatars";
import { AvatarsCircularAvatarsWithBottomNotification } from "~/components/AvatarsCircularAvatarsWithBottomNotification";
import { AvatarsCircularAvatarsWithPlaceholderIcon } from "~/components/AvatarsCircularAvatarsWithPlaceholderIcon";
import { AvatarsCircularAvatarsWithPlaceholderInitials } from "~/components/AvatarsCircularAvatarsWithPlaceholderInitials";
import { AvatarsCircularAvatarsWithTopNotification } from "~/components/AvatarsCircularAvatarsWithTopNotification";
import { AvatarsRoundedAvatars } from "~/components/AvatarsRoundedAvatars";
import { AvatarsRoundedAvatarsWithBottomNotification } from "~/components/AvatarsRoundedAvatarsWithBottomNotification";
import { AvatarsRoundedAvatarsWithTopNotification } from "~/components/AvatarsRoundedAvatarsWithTopNotification";
import { AvatarsWithText } from "~/components/AvatarsWithText";

const meta: Meta = {
  title: "Application UI/Elements/Avatars",
};

export default meta;

export const AvatarGroupStackedBottomToTop: StoryObj = {
  render: () => <AvatarsAvatarGroupStackedBottomToTop />,
};

export const AvatarGroupStackedTopToBottom: StoryObj = {
  render: () => <AvatarsAvatarGroupStackedTopToBottom />,
};

export const CircularAvatars: StoryObj = {
  render: () => <AvatarsCircularAvatars />,
};

export const CircularAvatarsWithBottomNotification: StoryObj = {
  render: () => <AvatarsCircularAvatarsWithBottomNotification />,
};

export const CircularAvatarsWithPlaceholderIcon: StoryObj = {
  render: () => <AvatarsCircularAvatarsWithPlaceholderIcon />,
};

export const CircularAvatarsWithPlaceholderInitials: StoryObj = {
  render: () => <AvatarsCircularAvatarsWithPlaceholderInitials />,
};

export const CircularAvatarsWithTopNotification: StoryObj = {
  render: () => <AvatarsCircularAvatarsWithTopNotification />,
};

export const RoundedAvatars: StoryObj = {
  render: () => <AvatarsRoundedAvatars />,
};

export const RoundedAvatarsWithBottomNotification: StoryObj = {
  render: () => <AvatarsRoundedAvatarsWithBottomNotification />,
};

export const RoundedAvatarsWithTopNotification: StoryObj = {
  render: () => <AvatarsRoundedAvatarsWithTopNotification />,
};

export const WithText: StoryObj = {
  render: () => <AvatarsWithText />,
};
