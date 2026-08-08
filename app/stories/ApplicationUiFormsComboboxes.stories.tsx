import type { Meta, StoryObj } from "@storybook/react";
import { ComboboxesSimple } from "~/components/ComboboxesSimple";
import { ComboboxesWithCheckOnLeft } from "~/components/ComboboxesWithCheckOnLeft";
import { ComboboxesWithImage } from "~/components/ComboboxesWithImage";
import { ComboboxesWithSecondaryText } from "~/components/ComboboxesWithSecondaryText";
import { ComboboxesWithStatusIndicator } from "~/components/ComboboxesWithStatusIndicator";

const meta: Meta = {
  title: "Application UI/Forms/Comboboxes",
};

export default meta;

export const Simple: StoryObj = {
  render: () => <ComboboxesSimple />,
};

export const WithCheckOnLeft: StoryObj = {
  render: () => <ComboboxesWithCheckOnLeft />,
};

export const WithImage: StoryObj = {
  render: () => <ComboboxesWithImage />,
};

export const WithSecondaryText: StoryObj = {
  render: () => <ComboboxesWithSecondaryText />,
};

export const WithStatusIndicator: StoryObj = {
  render: () => <ComboboxesWithStatusIndicator />,
};
