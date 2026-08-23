import type { Meta, StoryObj } from "@storybook/react";
import { NavbarsDarkWithQuickAction } from "~/components/NavbarsDarkWithQuickAction";
import { NavbarsDarkWithSearch } from "~/components/NavbarsDarkWithSearch";
import { NavbarsSimple } from "~/components/NavbarsSimple";
import { NavbarsSimpleDark } from "~/components/NavbarsSimpleDark";
import { NavbarsSimpleDarkWithMenuButtonOnLeft } from "~/components/NavbarsSimpleDarkWithMenuButtonOnLeft";
import { NavbarsSimpleWithMenuButtonOnLeft } from "~/components/NavbarsSimpleWithMenuButtonOnLeft";
import { NavbarsWithCenteredSearchAndSecondaryLinks } from "~/components/NavbarsWithCenteredSearchAndSecondaryLinks";
import { NavbarsWithCenteredSearchAndSecondaryLinksDark } from "~/components/NavbarsWithCenteredSearchAndSecondaryLinksDark";
import { NavbarsWithQuickAction } from "~/components/NavbarsWithQuickAction";
import { NavbarsWithSearch } from "~/components/NavbarsWithSearch";
import { NavbarsWithSearchInColumnLayout } from "~/components/NavbarsWithSearchInColumnLayout";
const meta: Meta = {
  title: "Application UI/Navigation/Navbars",
};
export default meta;
export const DarkWithQuickAction: StoryObj = {
  render: () => <NavbarsDarkWithQuickAction />,
};
export const DarkWithSearch: StoryObj = {
  render: () => <NavbarsDarkWithSearch />,
};
export const Simple: StoryObj = {
  render: () => <NavbarsSimple />,
};
export const SimpleDark: StoryObj = {
  render: () => <NavbarsSimpleDark />,
};
export const SimpleDarkWithMenuButtonOnLeft: StoryObj = {
  render: () => <NavbarsSimpleDarkWithMenuButtonOnLeft />,
};
export const SimpleWithMenuButtonOnLeft: StoryObj = {
  render: () => <NavbarsSimpleWithMenuButtonOnLeft />,
};
export const WithCenteredSearchAndSecondaryLinks: StoryObj = {
  render: () => <NavbarsWithCenteredSearchAndSecondaryLinks />,
};
export const WithCenteredSearchAndSecondaryLinksDark: StoryObj = {
  render: () => <NavbarsWithCenteredSearchAndSecondaryLinksDark />,
};
export const WithQuickAction: StoryObj = {
  render: () => <NavbarsWithQuickAction />,
};
export const WithSearch: StoryObj = {
  render: () => <NavbarsWithSearch />,
};
export const WithSearchInColumnLayout: StoryObj = {
  render: () => <NavbarsWithSearchInColumnLayout />,
};
