import type { Meta, StoryObj } from "@storybook/react";
import { CheckboxesListWithCheckboxOnRight } from "~/components/CheckboxesListWithCheckboxOnRight";
import { CheckboxesListWithDescription } from "~/components/CheckboxesListWithDescription";
import { CheckboxesListWithInlineDescription } from "~/components/CheckboxesListWithInlineDescription";
import { CheckboxesSimpleListWithHeading } from "~/components/CheckboxesSimpleListWithHeading";

const meta: Meta = {
  title: "Application UI/Forms/Checkboxes",
};

export default meta;

export const ListWithCheckboxOnRight: StoryObj = {
  render: () => <CheckboxesListWithCheckboxOnRight />,
};

export const ListWithDescription: StoryObj = {
  render: () => <CheckboxesListWithDescription />,
};

export const ListWithInlineDescription: StoryObj = {
  render: () => <CheckboxesListWithInlineDescription />,
};

export const SimpleListWithHeading: StoryObj = {
  render: () => <CheckboxesSimpleListWithHeading />,
};
