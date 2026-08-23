import type { Meta, StoryObj } from "@storybook/react";
import { FormLayoutsLabelsOnLeft } from "~/components/FormLayoutsLabelsOnLeft";
import { FormLayoutsStacked } from "~/components/FormLayoutsStacked";
import { FormLayoutsStackedOnDark } from "~/components/FormLayoutsStackedOnDark";
import { FormLayoutsTwoColumn } from "~/components/FormLayoutsTwoColumn";
import { FormLayoutsTwoColumnWithCards } from "~/components/FormLayoutsTwoColumnWithCards";
const meta: Meta = {
  title: "Application UI/Forms/Form Layouts",
};
export default meta;
export const LabelsOnLeft: StoryObj = {
  render: () => <FormLayoutsLabelsOnLeft />,
};
export const Stacked: StoryObj = {
  render: () => <FormLayoutsStacked />,
};
export const StackedOnDark: StoryObj = {
  render: () => <FormLayoutsStackedOnDark />,
};
export const TwoColumn: StoryObj = {
  render: () => <FormLayoutsTwoColumn />,
};
export const TwoColumnWithCards: StoryObj = {
  render: () => <FormLayoutsTwoColumnWithCards />,
};
