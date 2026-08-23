import type { Meta, StoryObj } from "@storybook/react";
import { SidebarNavigationBrand } from "~/components/SidebarNavigationBrand";
import { SidebarNavigationDark } from "~/components/SidebarNavigationDark";
import { SidebarNavigationLight } from "~/components/SidebarNavigationLight";
import { SidebarNavigationWithExpandableSections } from "~/components/SidebarNavigationWithExpandableSections";
import { SidebarNavigationWithSecondaryNavigation } from "~/components/SidebarNavigationWithSecondaryNavigation";
const meta: Meta = {
  title: "Application UI/Navigation/Sidebar Navigation",
};
export default meta;
export const Brand: StoryObj = {
  render: () => <SidebarNavigationBrand />,
};
export const Dark: StoryObj = {
  render: () => <SidebarNavigationDark />,
};
export const Light: StoryObj = {
  render: () => <SidebarNavigationLight />,
};
export const WithExpandableSections: StoryObj = {
  render: () => <SidebarNavigationWithExpandableSections />,
};
export const WithSecondaryNavigation: StoryObj = {
  render: () => <SidebarNavigationWithSecondaryNavigation />,
};
