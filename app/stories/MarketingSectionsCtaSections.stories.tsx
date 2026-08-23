import type { Meta, StoryObj } from "@storybook/react";
import { CtaSectionsCenteredOnDarkPanel } from "~/components/CtaSectionsCenteredOnDarkPanel";
import { CtaSectionsDarkPanelWithAppScreenshot } from "~/components/CtaSectionsDarkPanelWithAppScreenshot";
import { CtaSectionsSimpleCentered } from "~/components/CtaSectionsSimpleCentered";
import { CtaSectionsSimpleCenteredOnBrand } from "~/components/CtaSectionsSimpleCenteredOnBrand";
import { CtaSectionsSimpleCenteredOnDark } from "~/components/CtaSectionsSimpleCenteredOnDark";
import { CtaSectionsSimpleJustified } from "~/components/CtaSectionsSimpleJustified";
import { CtaSectionsSimpleJustifiedOnLightBrand } from "~/components/CtaSectionsSimpleJustifiedOnLightBrand";
import { CtaSectionsSimpleStacked } from "~/components/CtaSectionsSimpleStacked";
import { CtaSectionsSplitWithImage } from "~/components/CtaSectionsSplitWithImage";
import { CtaSectionsTwoColumnsWithPhotoOnDark } from "~/components/CtaSectionsTwoColumnsWithPhotoOnDark";
import { CtaSectionsWithImageTiles } from "~/components/CtaSectionsWithImageTiles";
const meta: Meta = {
  title: "Marketing/Sections/Cta Sections",
};
export default meta;
export const CenteredOnDarkPanel: StoryObj = {
  render: () => <CtaSectionsCenteredOnDarkPanel />,
};
export const DarkPanelWithAppScreenshot: StoryObj = {
  render: () => <CtaSectionsDarkPanelWithAppScreenshot />,
};
export const SimpleCentered: StoryObj = {
  render: () => <CtaSectionsSimpleCentered />,
};
export const SimpleCenteredOnBrand: StoryObj = {
  render: () => <CtaSectionsSimpleCenteredOnBrand />,
};
export const SimpleCenteredOnDark: StoryObj = {
  render: () => <CtaSectionsSimpleCenteredOnDark />,
};
export const SimpleJustified: StoryObj = {
  render: () => <CtaSectionsSimpleJustified />,
};
export const SimpleJustifiedOnLightBrand: StoryObj = {
  render: () => <CtaSectionsSimpleJustifiedOnLightBrand />,
};
export const SimpleStacked: StoryObj = {
  render: () => <CtaSectionsSimpleStacked />,
};
export const SplitWithImage: StoryObj = {
  render: () => <CtaSectionsSplitWithImage />,
};
export const TwoColumnsWithPhotoOnDark: StoryObj = {
  render: () => <CtaSectionsTwoColumnsWithPhotoOnDark />,
};
export const WithImageTiles: StoryObj = {
  render: () => <CtaSectionsWithImageTiles />,
};
