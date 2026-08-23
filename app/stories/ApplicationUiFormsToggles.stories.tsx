import type { Meta, StoryObj } from "@storybook/react";
import { TogglesShortToggle } from "~/components/TogglesShortToggle";
import { TogglesSimpleToggle } from "~/components/TogglesSimpleToggle";
import { TogglesToggleWithIcon } from "~/components/TogglesToggleWithIcon";
import { TogglesWithLeftLabelAndDescription } from "~/components/TogglesWithLeftLabelAndDescription";
import { TogglesWithRightLabel } from "~/components/TogglesWithRightLabel";
const meta: Meta = {
  title: "Application UI/Forms/Toggles",
};
export default meta;
export const ShortToggle: StoryObj = {
  render: () => <TogglesShortToggle />,
};
export const SimpleToggle: StoryObj = {
  render: () => <TogglesSimpleToggle />,
};
export const ToggleWithIcon: StoryObj = {
  render: () => <TogglesToggleWithIcon />,
};
export const WithLeftLabelAndDescription: StoryObj = {
  render: () => <TogglesWithLeftLabelAndDescription />,
};
export const WithRightLabel: StoryObj = {
  render: () => <TogglesWithRightLabel />,
};
