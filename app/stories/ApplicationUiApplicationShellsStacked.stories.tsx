import type { Meta, StoryObj } from "@storybook/react";
import { StackedBrandNavWithOverlap } from "~/components/StackedBrandNavWithOverlap";
import { StackedBrandedNavWithCompactWhitePageHeader } from "~/components/StackedBrandedNavWithCompactWhitePageHeader";
import { StackedBrandedNavWithWhitePageHeader } from "~/components/StackedBrandedNavWithWhitePageHeader";
import { StackedDarkNavWithCompactWhitePageHeader } from "~/components/StackedDarkNavWithCompactWhitePageHeader";
import { StackedDarkNavWithOverlap } from "~/components/StackedDarkNavWithOverlap";
import { StackedDarkNavWithWhitePageHeader } from "~/components/StackedDarkNavWithWhitePageHeader";
import { StackedLightNavOnGrayBackground } from "~/components/StackedLightNavOnGrayBackground";
import { StackedLightNavWithBottomBorder } from "~/components/StackedLightNavWithBottomBorder";
import { StackedTwoRowNavigationWithOverlap } from "~/components/StackedTwoRowNavigationWithOverlap";
const meta: Meta = {
  title: "Application UI/Application Shells/Stacked",
};
export default meta;
export const BrandNavWithOverlap: StoryObj = {
  render: () => <StackedBrandNavWithOverlap />,
};
export const BrandedNavWithCompactWhitePageHeader: StoryObj = {
  render: () => <StackedBrandedNavWithCompactWhitePageHeader />,
};
export const BrandedNavWithWhitePageHeader: StoryObj = {
  render: () => <StackedBrandedNavWithWhitePageHeader />,
};
export const DarkNavWithCompactWhitePageHeader: StoryObj = {
  render: () => <StackedDarkNavWithCompactWhitePageHeader />,
};
export const DarkNavWithOverlap: StoryObj = {
  render: () => <StackedDarkNavWithOverlap />,
};
export const DarkNavWithWhitePageHeader: StoryObj = {
  render: () => <StackedDarkNavWithWhitePageHeader />,
};
export const LightNavOnGrayBackground: StoryObj = {
  render: () => <StackedLightNavOnGrayBackground />,
};
export const LightNavWithBottomBorder: StoryObj = {
  render: () => <StackedLightNavWithBottomBorder />,
};
export const TwoRowNavigationWithOverlap: StoryObj = {
  render: () => <StackedTwoRowNavigationWithOverlap />,
};
