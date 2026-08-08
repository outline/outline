import type { Meta, StoryObj } from "@storybook/react";
import { ActionPanelsSimple } from "~/components/ActionPanelsSimple";
import { ActionPanelsSimpleWell } from "~/components/ActionPanelsSimpleWell";
import { ActionPanelsWithButtonAtTopRight } from "~/components/ActionPanelsWithButtonAtTopRight";
import { ActionPanelsWithButtonOnRight } from "~/components/ActionPanelsWithButtonOnRight";
import { ActionPanelsWithInput } from "~/components/ActionPanelsWithInput";
import { ActionPanelsWithLink } from "~/components/ActionPanelsWithLink";
import { ActionPanelsWithToggle } from "~/components/ActionPanelsWithToggle";
import { ActionPanelsWithWell } from "~/components/ActionPanelsWithWell";

const meta: Meta = {
  title: "Application UI/Forms/Action Panels",
};

export default meta;

export const Simple: StoryObj = {
  render: () => <ActionPanelsSimple />,
};

export const SimpleWell: StoryObj = {
  render: () => <ActionPanelsSimpleWell />,
};

export const WithButtonAtTopRight: StoryObj = {
  render: () => <ActionPanelsWithButtonAtTopRight />,
};

export const WithButtonOnRight: StoryObj = {
  render: () => <ActionPanelsWithButtonOnRight />,
};

export const WithInput: StoryObj = {
  render: () => <ActionPanelsWithInput />,
};

export const WithLink: StoryObj = {
  render: () => <ActionPanelsWithLink />,
};

export const WithToggle: StoryObj = {
  render: () => <ActionPanelsWithToggle />,
};

export const WithWell: StoryObj = {
  render: () => <ActionPanelsWithWell />,
};
