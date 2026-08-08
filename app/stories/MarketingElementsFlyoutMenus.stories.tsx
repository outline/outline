import type { Meta, StoryObj } from "@storybook/react";
import { FlyoutMenusFullWidth } from "~/components/FlyoutMenusFullWidth";
import { FlyoutMenusFullWidthTwoColumns } from "~/components/FlyoutMenusFullWidthTwoColumns";
import { FlyoutMenusSimple } from "~/components/FlyoutMenusSimple";
import { FlyoutMenusSimpleWithDescriptions } from "~/components/FlyoutMenusSimpleWithDescriptions";
import { FlyoutMenusStackedWithFooterActions } from "~/components/FlyoutMenusStackedWithFooterActions";
import { FlyoutMenusStackedWithFooterList } from "~/components/FlyoutMenusStackedWithFooterList";
import { FlyoutMenusTwoColumn } from "~/components/FlyoutMenusTwoColumn";

const meta: Meta = {
  title: "Marketing/Elements/Flyout Menus",
};

export default meta;

export const FullWidth: StoryObj = {
  render: () => <FlyoutMenusFullWidth />,
};

export const FullWidthTwoColumns: StoryObj = {
  render: () => <FlyoutMenusFullWidthTwoColumns />,
};

export const Simple: StoryObj = {
  render: () => <FlyoutMenusSimple />,
};

export const SimpleWithDescriptions: StoryObj = {
  render: () => <FlyoutMenusSimpleWithDescriptions />,
};

export const StackedWithFooterActions: StoryObj = {
  render: () => <FlyoutMenusStackedWithFooterActions />,
};

export const StackedWithFooterList: StoryObj = {
  render: () => <FlyoutMenusStackedWithFooterList />,
};

export const TwoColumn: StoryObj = {
  render: () => <FlyoutMenusTwoColumn />,
};
