import type { Meta, StoryObj } from "@storybook/react";
import { HomeScreensSidebarOnDark } from "~/components/HomeScreensSidebarOnDark";
import { HomeScreensStacked } from "~/components/HomeScreensStacked";

const meta: Meta = {
  title: "Application UI/Page Examples/Home Screens",
};

export default meta;

export const SidebarOnDark: StoryObj = {
  render: () => <HomeScreensSidebarOnDark />,
};

export const Stacked: StoryObj = {
  render: () => <HomeScreensStacked />,
};
