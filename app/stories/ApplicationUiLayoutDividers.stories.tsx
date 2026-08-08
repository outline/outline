import type { Meta, StoryObj } from "@storybook/react";
import { DividersWithButton } from "~/components/DividersWithButton";
import { DividersWithIcon } from "~/components/DividersWithIcon";
import { DividersWithLabel } from "~/components/DividersWithLabel";
import { DividersWithLabelOnLeft } from "~/components/DividersWithLabelOnLeft";
import { DividersWithTitle } from "~/components/DividersWithTitle";
import { DividersWithTitleAndButton } from "~/components/DividersWithTitleAndButton";
import { DividersWithTitleOnLeft } from "~/components/DividersWithTitleOnLeft";
import { DividersWithToolbar } from "~/components/DividersWithToolbar";

const meta: Meta = {
  title: "Application UI/Layout/Dividers",
};

export default meta;

export const WithButton: StoryObj = {
  render: () => <DividersWithButton />,
};

export const WithIcon: StoryObj = {
  render: () => <DividersWithIcon />,
};

export const WithLabel: StoryObj = {
  render: () => <DividersWithLabel />,
};

export const WithLabelOnLeft: StoryObj = {
  render: () => <DividersWithLabelOnLeft />,
};

export const WithTitle: StoryObj = {
  render: () => <DividersWithTitle />,
};

export const WithTitleAndButton: StoryObj = {
  render: () => <DividersWithTitleAndButton />,
};

export const WithTitleOnLeft: StoryObj = {
  render: () => <DividersWithTitleOnLeft />,
};

export const WithToolbar: StoryObj = {
  render: () => <DividersWithToolbar />,
};
