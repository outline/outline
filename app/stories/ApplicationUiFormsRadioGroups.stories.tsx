import type { Meta, StoryObj } from "@storybook/react";
import { RadioGroupsCards } from "~/components/RadioGroupsCards";
import { RadioGroupsColorPicker } from "~/components/RadioGroupsColorPicker";
import { RadioGroupsListWithDescription } from "~/components/RadioGroupsListWithDescription";
import { RadioGroupsListWithDescriptionsInPanel } from "~/components/RadioGroupsListWithDescriptionsInPanel";
import { RadioGroupsListWithInlineDescription } from "~/components/RadioGroupsListWithInlineDescription";
import { RadioGroupsListWithRadioOnRight } from "~/components/RadioGroupsListWithRadioOnRight";
import { RadioGroupsSimpleInlineList } from "~/components/RadioGroupsSimpleInlineList";
import { RadioGroupsSimpleList } from "~/components/RadioGroupsSimpleList";
import { RadioGroupsSimpleListWithRadioOnRight } from "~/components/RadioGroupsSimpleListWithRadioOnRight";
import { RadioGroupsSimpleTable } from "~/components/RadioGroupsSimpleTable";
import { RadioGroupsSmallCards } from "~/components/RadioGroupsSmallCards";
import { RadioGroupsStackedCards } from "~/components/RadioGroupsStackedCards";
const meta: Meta = {
  title: "Application UI/Forms/Radio Groups",
};
export default meta;
export const Cards: StoryObj = {
  render: () => <RadioGroupsCards />,
};
export const ColorPicker: StoryObj = {
  render: () => <RadioGroupsColorPicker />,
};
export const ListWithDescription: StoryObj = {
  render: () => <RadioGroupsListWithDescription />,
};
export const ListWithDescriptionsInPanel: StoryObj = {
  render: () => <RadioGroupsListWithDescriptionsInPanel />,
};
export const ListWithInlineDescription: StoryObj = {
  render: () => <RadioGroupsListWithInlineDescription />,
};
export const ListWithRadioOnRight: StoryObj = {
  render: () => <RadioGroupsListWithRadioOnRight />,
};
export const SimpleInlineList: StoryObj = {
  render: () => <RadioGroupsSimpleInlineList />,
};
export const SimpleList: StoryObj = {
  render: () => <RadioGroupsSimpleList />,
};
export const SimpleListWithRadioOnRight: StoryObj = {
  render: () => <RadioGroupsSimpleListWithRadioOnRight />,
};
export const SimpleTable: StoryObj = {
  render: () => <RadioGroupsSimpleTable />,
};
export const SmallCards: StoryObj = {
  render: () => <RadioGroupsSmallCards />,
};
export const StackedCards: StoryObj = {
  render: () => <RadioGroupsStackedCards />,
};
