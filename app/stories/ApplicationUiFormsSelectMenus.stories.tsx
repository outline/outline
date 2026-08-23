import type { Meta, StoryObj } from "@storybook/react";
import { SelectMenusBrandedWithSupportedText } from "~/components/SelectMenusBrandedWithSupportedText";
import { SelectMenusCustomWithAvatar } from "~/components/SelectMenusCustomWithAvatar";
import { SelectMenusCustomWithCheckOnLeft } from "~/components/SelectMenusCustomWithCheckOnLeft";
import { SelectMenusCustomWithStatusIndicator } from "~/components/SelectMenusCustomWithStatusIndicator";
import { SelectMenusSimpleCustom } from "~/components/SelectMenusSimpleCustom";
import { SelectMenusSimpleNative } from "~/components/SelectMenusSimpleNative";
import { SelectMenusWithSecondaryText } from "~/components/SelectMenusWithSecondaryText";
const meta: Meta = {
  title: "Application UI/Forms/Select Menus",
};
export default meta;
export const BrandedWithSupportedText: StoryObj = {
  render: () => <SelectMenusBrandedWithSupportedText />,
};
export const CustomWithAvatar: StoryObj = {
  render: () => <SelectMenusCustomWithAvatar />,
};
export const CustomWithCheckOnLeft: StoryObj = {
  render: () => <SelectMenusCustomWithCheckOnLeft />,
};
export const CustomWithStatusIndicator: StoryObj = {
  render: () => <SelectMenusCustomWithStatusIndicator />,
};
export const SimpleCustom: StoryObj = {
  render: () => <SelectMenusSimpleCustom />,
};
export const SimpleNative: StoryObj = {
  render: () => <SelectMenusSimpleNative />,
};
export const WithSecondaryText: StoryObj = {
  render: () => <SelectMenusWithSecondaryText />,
};
