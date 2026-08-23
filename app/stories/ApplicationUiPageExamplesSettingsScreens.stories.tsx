import type { Meta, StoryObj } from "@storybook/react";
import { SettingsScreensSidebarOnDark } from "~/components/SettingsScreensSidebarOnDark";
import { SettingsScreensStacked } from "~/components/SettingsScreensStacked";
const meta: Meta = {
  title: "Application UI/Page Examples/Settings Screens",
};
export default meta;
export const SidebarOnDark: StoryObj = {
  render: () => <SettingsScreensSidebarOnDark />,
};
export const Stacked: StoryObj = {
  render: () => <SettingsScreensStacked />,
};
