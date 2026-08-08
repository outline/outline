import type { Meta, StoryObj } from "@storybook/react";
import { VerticalNavigationOnGray } from "~/components/VerticalNavigationOnGray";
import { VerticalNavigationSimple } from "~/components/VerticalNavigationSimple";
import { VerticalNavigationWithBadges } from "~/components/VerticalNavigationWithBadges";
import { VerticalNavigationWithIcons } from "~/components/VerticalNavigationWithIcons";
import { VerticalNavigationWithIconsAndBadges } from "~/components/VerticalNavigationWithIconsAndBadges";
import { VerticalNavigationWithSecondaryNavigation } from "~/components/VerticalNavigationWithSecondaryNavigation";

const meta: Meta = {
  title: "Application UI/Navigation/Vertical Navigation",
};

export default meta;

export const OnGray: StoryObj = {
  render: () => <VerticalNavigationOnGray />,
};

export const Simple: StoryObj = {
  render: () => <VerticalNavigationSimple />,
};

export const WithBadges: StoryObj = {
  render: () => <VerticalNavigationWithBadges />,
};

export const WithIcons: StoryObj = {
  render: () => <VerticalNavigationWithIcons />,
};

export const WithIconsAndBadges: StoryObj = {
  render: () => <VerticalNavigationWithIconsAndBadges />,
};

export const WithSecondaryNavigation: StoryObj = {
  render: () => <VerticalNavigationWithSecondaryNavigation />,
};
