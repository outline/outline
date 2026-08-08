import type { Meta, StoryObj } from "@storybook/react";
import { ButtonGroupsBasic } from "~/components/ButtonGroupsBasic";
import { ButtonGroupsIconOnly } from "~/components/ButtonGroupsIconOnly";
import { ButtonGroupsWithCheckboxAndDropdown } from "~/components/ButtonGroupsWithCheckboxAndDropdown";
import { ButtonGroupsWithDropdown } from "~/components/ButtonGroupsWithDropdown";
import { ButtonGroupsWithStat } from "~/components/ButtonGroupsWithStat";

const meta: Meta = {
  title: "Application UI/Elements/Button Groups",
};

export default meta;

export const Basic: StoryObj = {
  render: () => <ButtonGroupsBasic />,
};

export const IconOnly: StoryObj = {
  render: () => <ButtonGroupsIconOnly />,
};

export const WithCheckboxAndDropdown: StoryObj = {
  render: () => <ButtonGroupsWithCheckboxAndDropdown />,
};

export const WithDropdown: StoryObj = {
  render: () => <ButtonGroupsWithDropdown />,
};

export const WithStat: StoryObj = {
  render: () => <ButtonGroupsWithStat />,
};
