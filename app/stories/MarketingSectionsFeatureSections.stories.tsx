import type { Meta, StoryObj } from "@storybook/react";
import { FeatureSectionsCentered2x2Grid } from "~/components/FeatureSectionsCentered2x2Grid";
import { FeatureSectionsContainedInPanel } from "~/components/FeatureSectionsContainedInPanel";
import { FeatureSectionsOffset2x2Grid } from "~/components/FeatureSectionsOffset2x2Grid";
import { FeatureSectionsOffsetWithFeatureList } from "~/components/FeatureSectionsOffsetWithFeatureList";
import { FeatureSectionsSimple } from "~/components/FeatureSectionsSimple";
import { FeatureSectionsSimpleThreeColumnWithLargeIcons } from "~/components/FeatureSectionsSimpleThreeColumnWithLargeIcons";
import { FeatureSectionsSimpleThreeColumnWithLargeIconsOnDark } from "~/components/FeatureSectionsSimpleThreeColumnWithLargeIconsOnDark";
import { FeatureSectionsSimpleThreeColumnWithSmallIcons } from "~/components/FeatureSectionsSimpleThreeColumnWithSmallIcons";
import { FeatureSectionsSimpleThreeColumnWithSmallIconsOnDark } from "~/components/FeatureSectionsSimpleThreeColumnWithSmallIconsOnDark";
import { FeatureSectionsSimpleTwoColumnWithSmallIconsOnDark } from "~/components/FeatureSectionsSimpleTwoColumnWithSmallIconsOnDark";
import { FeatureSectionsWithCodeExamplePanel } from "~/components/FeatureSectionsWithCodeExamplePanel";
import { FeatureSectionsWithLargeScreenshot } from "~/components/FeatureSectionsWithLargeScreenshot";
import { FeatureSectionsWithLargeScreenshotOnDark } from "~/components/FeatureSectionsWithLargeScreenshotOnDark";
import { FeatureSectionsWithProductScreenshot } from "~/components/FeatureSectionsWithProductScreenshot";
import { FeatureSectionsWithProductScreenshotOnDark } from "~/components/FeatureSectionsWithProductScreenshotOnDark";
import { FeatureSectionsWithProductScreenshotOnLeft } from "~/components/FeatureSectionsWithProductScreenshotOnLeft";
import { FeatureSectionsWithProductScreenshotPanel } from "~/components/FeatureSectionsWithProductScreenshotPanel";
import { FeatureSectionsWithTestimonial } from "~/components/FeatureSectionsWithTestimonial";

const meta: Meta = {
  title: "Marketing/Sections/Feature Sections",
};

export default meta;

export const Centered2x2Grid: StoryObj = {
  render: () => <FeatureSectionsCentered2x2Grid />,
};

export const ContainedInPanel: StoryObj = {
  render: () => <FeatureSectionsContainedInPanel />,
};

export const Offset2x2Grid: StoryObj = {
  render: () => <FeatureSectionsOffset2x2Grid />,
};

export const OffsetWithFeatureList: StoryObj = {
  render: () => <FeatureSectionsOffsetWithFeatureList />,
};

export const Simple: StoryObj = {
  render: () => <FeatureSectionsSimple />,
};

export const SimpleThreeColumnWithLargeIcons: StoryObj = {
  render: () => <FeatureSectionsSimpleThreeColumnWithLargeIcons />,
};

export const SimpleThreeColumnWithLargeIconsOnDark: StoryObj = {
  render: () => <FeatureSectionsSimpleThreeColumnWithLargeIconsOnDark />,
};

export const SimpleThreeColumnWithSmallIcons: StoryObj = {
  render: () => <FeatureSectionsSimpleThreeColumnWithSmallIcons />,
};

export const SimpleThreeColumnWithSmallIconsOnDark: StoryObj = {
  render: () => <FeatureSectionsSimpleThreeColumnWithSmallIconsOnDark />,
};

export const SimpleTwoColumnWithSmallIconsOnDark: StoryObj = {
  render: () => <FeatureSectionsSimpleTwoColumnWithSmallIconsOnDark />,
};

export const WithCodeExamplePanel: StoryObj = {
  render: () => <FeatureSectionsWithCodeExamplePanel />,
};

export const WithLargeScreenshot: StoryObj = {
  render: () => <FeatureSectionsWithLargeScreenshot />,
};

export const WithLargeScreenshotOnDark: StoryObj = {
  render: () => <FeatureSectionsWithLargeScreenshotOnDark />,
};

export const WithProductScreenshot: StoryObj = {
  render: () => <FeatureSectionsWithProductScreenshot />,
};

export const WithProductScreenshotOnDark: StoryObj = {
  render: () => <FeatureSectionsWithProductScreenshotOnDark />,
};

export const WithProductScreenshotOnLeft: StoryObj = {
  render: () => <FeatureSectionsWithProductScreenshotOnLeft />,
};

export const WithProductScreenshotPanel: StoryObj = {
  render: () => <FeatureSectionsWithProductScreenshotPanel />,
};

export const WithTestimonial: StoryObj = {
  render: () => <FeatureSectionsWithTestimonial />,
};
