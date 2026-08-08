import type { Meta, StoryObj } from "@storybook/react";
import { DetailScreensSidebarOnDark } from "~/components/DetailScreensSidebarOnDark";
import { DetailScreensStacked } from "~/components/DetailScreensStacked";

const meta: Meta = {
  title: "Application UI/Page Examples/Detail Screens",
};

export default meta;

export const SidebarOnDark: StoryObj = {
  render: () => <DetailScreensSidebarOnDark />,
};

export const Stacked: StoryObj = {
  render: () => <DetailScreensStacked />,
};
