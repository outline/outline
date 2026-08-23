import type { Meta, StoryObj } from "@storybook/react";
import { CardHeadingsSimple } from "~/components/CardHeadingsSimple";
import { CardHeadingsWithAction } from "~/components/CardHeadingsWithAction";
import { CardHeadingsWithAvatarAndActions } from "~/components/CardHeadingsWithAvatarAndActions";
import { CardHeadingsWithAvatarMetaAndDropdown } from "~/components/CardHeadingsWithAvatarMetaAndDropdown";
import { CardHeadingsWithDescription } from "~/components/CardHeadingsWithDescription";
import { CardHeadingsWithDescriptionAndAction } from "~/components/CardHeadingsWithDescriptionAndAction";
const meta: Meta = {
  title: "Application UI/Headings/Card Headings",
};
export default meta;
export const Simple: StoryObj = {
  render: () => <CardHeadingsSimple />,
};
export const WithAction: StoryObj = {
  render: () => <CardHeadingsWithAction />,
};
export const WithAvatarAndActions: StoryObj = {
  render: () => <CardHeadingsWithAvatarAndActions />,
};
export const WithAvatarMetaAndDropdown: StoryObj = {
  render: () => <CardHeadingsWithAvatarMetaAndDropdown />,
};
export const WithDescription: StoryObj = {
  render: () => <CardHeadingsWithDescription />,
};
export const WithDescriptionAndAction: StoryObj = {
  render: () => <CardHeadingsWithDescriptionAndAction />,
};
