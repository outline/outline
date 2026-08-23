import type { Meta, StoryObj } from "@storybook/react";
import { HeadersConstrained } from "~/components/HeadersConstrained";
import { HeadersFullWidth } from "~/components/HeadersFullWidth";
import { HeadersOnBrandBackground } from "~/components/HeadersOnBrandBackground";
import { HeadersOnDarkBackground } from "~/components/HeadersOnDarkBackground";
import { HeadersWithCallToAction } from "~/components/HeadersWithCallToAction";
import { HeadersWithCenteredLogo } from "~/components/HeadersWithCenteredLogo";
import { HeadersWithFullWidthFlyoutMenu } from "~/components/HeadersWithFullWidthFlyoutMenu";
import { HeadersWithIconsInMobileMenu } from "~/components/HeadersWithIconsInMobileMenu";
import { HeadersWithLeftAlignedNav } from "~/components/HeadersWithLeftAlignedNav";
import { HeadersWithMultipleFlyoutMenus } from "~/components/HeadersWithMultipleFlyoutMenus";
import { HeadersWithRightAlignedNav } from "~/components/HeadersWithRightAlignedNav";
import { HeadersWithStackedFlyoutMenu } from "~/components/HeadersWithStackedFlyoutMenu";
const meta: Meta = {
  title: "Marketing/Elements/Headers",
};
export default meta;
export const Constrained: StoryObj = {
  render: () => <HeadersConstrained />,
};
export const FullWidth: StoryObj = {
  render: () => <HeadersFullWidth />,
};
export const OnBrandBackground: StoryObj = {
  render: () => <HeadersOnBrandBackground />,
};
export const OnDarkBackground: StoryObj = {
  render: () => <HeadersOnDarkBackground />,
};
export const WithCallToAction: StoryObj = {
  render: () => <HeadersWithCallToAction />,
};
export const WithCenteredLogo: StoryObj = {
  render: () => <HeadersWithCenteredLogo />,
};
export const WithFullWidthFlyoutMenu: StoryObj = {
  render: () => <HeadersWithFullWidthFlyoutMenu />,
};
export const WithIconsInMobileMenu: StoryObj = {
  render: () => <HeadersWithIconsInMobileMenu />,
};
export const WithLeftAlignedNav: StoryObj = {
  render: () => <HeadersWithLeftAlignedNav />,
};
export const WithMultipleFlyoutMenus: StoryObj = {
  render: () => <HeadersWithMultipleFlyoutMenus />,
};
export const WithRightAlignedNav: StoryObj = {
  render: () => <HeadersWithRightAlignedNav />,
};
export const WithStackedFlyoutMenu: StoryObj = {
  render: () => <HeadersWithStackedFlyoutMenu />,
};
