import type { Meta, StoryObj } from "@storybook/react";
import { SectionHeadingsSimple } from "~/components/SectionHeadingsSimple";
import { SectionHeadingsWithAction } from "~/components/SectionHeadingsWithAction";
import { SectionHeadingsWithActions } from "~/components/SectionHeadingsWithActions";
import { SectionHeadingsWithActionsAndTabs } from "~/components/SectionHeadingsWithActionsAndTabs";
import { SectionHeadingsWithBadgeAndDropdown } from "~/components/SectionHeadingsWithBadgeAndDropdown";
import { SectionHeadingsWithDescription } from "~/components/SectionHeadingsWithDescription";
import { SectionHeadingsWithInlineTabs } from "~/components/SectionHeadingsWithInlineTabs";
import { SectionHeadingsWithInputGroup } from "~/components/SectionHeadingsWithInputGroup";
import { SectionHeadingsWithLabel } from "~/components/SectionHeadingsWithLabel";
import { SectionHeadingsWithTabs } from "~/components/SectionHeadingsWithTabs";

const meta: Meta = {
  title: "Application UI/Headings/Section Headings",
};

export default meta;

export const Simple: StoryObj = {
  render: () => <SectionHeadingsSimple />,
};

export const WithAction: StoryObj = {
  render: () => <SectionHeadingsWithAction />,
};

export const WithActions: StoryObj = {
  render: () => <SectionHeadingsWithActions />,
};

export const WithActionsAndTabs: StoryObj = {
  render: () => <SectionHeadingsWithActionsAndTabs />,
};

export const WithBadgeAndDropdown: StoryObj = {
  render: () => <SectionHeadingsWithBadgeAndDropdown />,
};

export const WithDescription: StoryObj = {
  render: () => <SectionHeadingsWithDescription />,
};

export const WithInlineTabs: StoryObj = {
  render: () => <SectionHeadingsWithInlineTabs />,
};

export const WithInputGroup: StoryObj = {
  render: () => <SectionHeadingsWithInputGroup />,
};

export const WithLabel: StoryObj = {
  render: () => <SectionHeadingsWithLabel />,
};

export const WithTabs: StoryObj = {
  render: () => <SectionHeadingsWithTabs />,
};
