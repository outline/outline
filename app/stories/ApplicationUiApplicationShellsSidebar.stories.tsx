import type { Meta, StoryObj } from "@storybook/react";
import { SidebarBrandSidebar } from "~/components/SidebarBrandSidebar";
import { SidebarBrandSidebarWithHeader } from "~/components/SidebarBrandSidebarWithHeader";
import { SidebarDarkSidebar } from "~/components/SidebarDarkSidebar";
import { SidebarDarkSidebarWithHeader } from "~/components/SidebarDarkSidebarWithHeader";
import { SidebarLightSidebar } from "~/components/SidebarLightSidebar";
import { SidebarLightSidebarWithConstrainedContentArea } from "~/components/SidebarLightSidebarWithConstrainedContentArea";
import { SidebarLightSidebarWithHeader } from "~/components/SidebarLightSidebarWithHeader";
import { SidebarLightSidebarWithOffWhiteBackground } from "~/components/SidebarLightSidebarWithOffWhiteBackground";

const meta: Meta = {
  title: "Application UI/Application Shells/Sidebar",
};

export default meta;

export const BrandSidebar: StoryObj = {
  render: () => <SidebarBrandSidebar />,
};

export const BrandSidebarWithHeader: StoryObj = {
  render: () => <SidebarBrandSidebarWithHeader />,
};

export const DarkSidebar: StoryObj = {
  render: () => <SidebarDarkSidebar />,
};

export const DarkSidebarWithHeader: StoryObj = {
  render: () => <SidebarDarkSidebarWithHeader />,
};

export const LightSidebar: StoryObj = {
  render: () => <SidebarLightSidebar />,
};

export const LightSidebarWithConstrainedContentArea: StoryObj = {
  render: () => <SidebarLightSidebarWithConstrainedContentArea />,
};

export const LightSidebarWithHeader: StoryObj = {
  render: () => <SidebarLightSidebarWithHeader />,
};

export const LightSidebarWithOffWhiteBackground: StoryObj = {
  render: () => <SidebarLightSidebarWithOffWhiteBackground />,
};
