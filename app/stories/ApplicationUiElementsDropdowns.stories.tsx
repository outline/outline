import type { Meta, StoryObj } from "@storybook/react";
import { DropdownsSimple } from "~/components/DropdownsSimple";
import { DropdownsWithDividers } from "~/components/DropdownsWithDividers";
import { DropdownsWithIcons } from "~/components/DropdownsWithIcons";
import { DropdownsWithMinimalMenuIcon } from "~/components/DropdownsWithMinimalMenuIcon";
import { DropdownsWithSimpleHeader } from "~/components/DropdownsWithSimpleHeader";
const meta: Meta = {
  title: "Application UI/Elements/Dropdowns",
};
export default meta;
export const Simple: StoryObj = {
  render: () => <DropdownsSimple />,
};
export const WithDividers: StoryObj = {
  render: () => <DropdownsWithDividers />,
};
export const WithIcons: StoryObj = {
  render: () => <DropdownsWithIcons />,
};
export const WithMinimalMenuIcon: StoryObj = {
  render: () => <DropdownsWithMinimalMenuIcon />,
};
export const WithSimpleHeader: StoryObj = {
  render: () => <DropdownsWithSimpleHeader />,
};
