import type { Meta, StoryObj } from "@storybook/react";
import { FeedsSimpleWithIcons } from "~/components/FeedsSimpleWithIcons";
import { FeedsWithComments } from "~/components/FeedsWithComments";
import { FeedsWithMultipleItemTypes } from "~/components/FeedsWithMultipleItemTypes";

const meta: Meta = {
  title: "Application UI/Lists/Feeds",
};

export default meta;

export const SimpleWithIcons: StoryObj = {
  render: () => <FeedsSimpleWithIcons />,
};

export const WithComments: StoryObj = {
  render: () => <FeedsWithComments />,
};

export const WithMultipleItemTypes: StoryObj = {
  render: () => <FeedsWithMultipleItemTypes />,
};
