import type { Meta, StoryObj } from "@storybook/react";
import { LogoCloudsGrid } from "~/components/LogoCloudsGrid";
import { LogoCloudsGridOnDark } from "~/components/LogoCloudsGridOnDark";
import { LogoCloudsSimple } from "~/components/LogoCloudsSimple";
import { LogoCloudsSimpleLeftAligned } from "~/components/LogoCloudsSimpleLeftAligned";
import { LogoCloudsSimpleLeftAlignedOnDark } from "~/components/LogoCloudsSimpleLeftAlignedOnDark";
import { LogoCloudsSimpleOnDark } from "~/components/LogoCloudsSimpleOnDark";
import { LogoCloudsSimpleWithCallToAction } from "~/components/LogoCloudsSimpleWithCallToAction";
import { LogoCloudsSimpleWithCallToActionOnDark } from "~/components/LogoCloudsSimpleWithCallToActionOnDark";
import { LogoCloudsSimpleWithHeading } from "~/components/LogoCloudsSimpleWithHeading";
import { LogoCloudsSimpleWithHeadingOnDark } from "~/components/LogoCloudsSimpleWithHeadingOnDark";
import { LogoCloudsSplitWithLogosOnRight } from "~/components/LogoCloudsSplitWithLogosOnRight";
import { LogoCloudsSplitWithLogosOnRightOnDark } from "~/components/LogoCloudsSplitWithLogosOnRightOnDark";

const meta: Meta = {
  title: "Marketing/Sections/Logo Clouds",
};

export default meta;

export const Grid: StoryObj = {
  render: () => <LogoCloudsGrid />,
};

export const GridOnDark: StoryObj = {
  render: () => <LogoCloudsGridOnDark />,
};

export const Simple: StoryObj = {
  render: () => <LogoCloudsSimple />,
};

export const SimpleLeftAligned: StoryObj = {
  render: () => <LogoCloudsSimpleLeftAligned />,
};

export const SimpleLeftAlignedOnDark: StoryObj = {
  render: () => <LogoCloudsSimpleLeftAlignedOnDark />,
};

export const SimpleOnDark: StoryObj = {
  render: () => <LogoCloudsSimpleOnDark />,
};

export const SimpleWithCallToAction: StoryObj = {
  render: () => <LogoCloudsSimpleWithCallToAction />,
};

export const SimpleWithCallToActionOnDark: StoryObj = {
  render: () => <LogoCloudsSimpleWithCallToActionOnDark />,
};

export const SimpleWithHeading: StoryObj = {
  render: () => <LogoCloudsSimpleWithHeading />,
};

export const SimpleWithHeadingOnDark: StoryObj = {
  render: () => <LogoCloudsSimpleWithHeadingOnDark />,
};

export const SplitWithLogosOnRight: StoryObj = {
  render: () => <LogoCloudsSplitWithLogosOnRight />,
};

export const SplitWithLogosOnRightOnDark: StoryObj = {
  render: () => <LogoCloudsSplitWithLogosOnRightOnDark />,
};
