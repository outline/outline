import type { Meta, StoryObj } from "@storybook/react";
import { TabsBarWithUnderline } from "~/components/TabsBarWithUnderline";
import { TabsFullWidthTabsWithUnderline } from "~/components/TabsFullWidthTabsWithUnderline";
import { TabsSimpleOnDark } from "~/components/TabsSimpleOnDark";
import { TabsTabsInPills } from "~/components/TabsTabsInPills";
import { TabsTabsInPillsOnGray } from "~/components/TabsTabsInPillsOnGray";
import { TabsTabsInPillsWithBrandColor } from "~/components/TabsTabsInPillsWithBrandColor";
import { TabsTabsWithUnderline } from "~/components/TabsTabsWithUnderline";
import { TabsTabsWithUnderlineAndBadges } from "~/components/TabsTabsWithUnderlineAndBadges";
import { TabsTabsWithUnderlineAndIcons } from "~/components/TabsTabsWithUnderlineAndIcons";

const meta: Meta = {
  title: "Application UI/Navigation/Tabs",
};

export default meta;

export const BarWithUnderline: StoryObj = {
  render: () => <TabsBarWithUnderline />,
};

export const FullWidthTabsWithUnderline: StoryObj = {
  render: () => <TabsFullWidthTabsWithUnderline />,
};

export const SimpleOnDark: StoryObj = {
  render: () => <TabsSimpleOnDark />,
};

export const TabsInPills: StoryObj = {
  render: () => <TabsTabsInPills />,
};

export const TabsInPillsOnGray: StoryObj = {
  render: () => <TabsTabsInPillsOnGray />,
};

export const TabsInPillsWithBrandColor: StoryObj = {
  render: () => <TabsTabsInPillsWithBrandColor />,
};

export const TabsWithUnderline: StoryObj = {
  render: () => <TabsTabsWithUnderline />,
};

export const TabsWithUnderlineAndBadges: StoryObj = {
  render: () => <TabsTabsWithUnderlineAndBadges />,
};

export const TabsWithUnderlineAndIcons: StoryObj = {
  render: () => <TabsTabsWithUnderlineAndIcons />,
};
