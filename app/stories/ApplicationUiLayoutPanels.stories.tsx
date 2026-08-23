import type { Meta, StoryObj } from "@storybook/react";
import { PanelsBasicCard } from "~/components/PanelsBasicCard";
import { PanelsCardEdgeToEdgeOnMobile } from "~/components/PanelsCardEdgeToEdgeOnMobile";
import { PanelsCardWithFooter } from "~/components/PanelsCardWithFooter";
import { PanelsCardWithGrayBody } from "~/components/PanelsCardWithGrayBody";
import { PanelsCardWithGrayFooter } from "~/components/PanelsCardWithGrayFooter";
import { PanelsCardWithHeader } from "~/components/PanelsCardWithHeader";
import { PanelsCardWithHeaderAndFooter } from "~/components/PanelsCardWithHeaderAndFooter";
import { PanelsWell } from "~/components/PanelsWell";
import { PanelsWellEdgeToEdgeOnMobile } from "~/components/PanelsWellEdgeToEdgeOnMobile";
import { PanelsWellOnGray } from "~/components/PanelsWellOnGray";
const meta: Meta = {
  title: "Application UI/Layout/Panels",
};
export default meta;
export const BasicCard: StoryObj = {
  render: () => <PanelsBasicCard />,
};
export const CardEdgeToEdgeOnMobile: StoryObj = {
  render: () => <PanelsCardEdgeToEdgeOnMobile />,
};
export const CardWithFooter: StoryObj = {
  render: () => <PanelsCardWithFooter />,
};
export const CardWithGrayBody: StoryObj = {
  render: () => <PanelsCardWithGrayBody />,
};
export const CardWithGrayFooter: StoryObj = {
  render: () => <PanelsCardWithGrayFooter />,
};
export const CardWithHeader: StoryObj = {
  render: () => <PanelsCardWithHeader />,
};
export const CardWithHeaderAndFooter: StoryObj = {
  render: () => <PanelsCardWithHeaderAndFooter />,
};
export const Well: StoryObj = {
  render: () => <PanelsWell />,
};
export const WellEdgeToEdgeOnMobile: StoryObj = {
  render: () => <PanelsWellEdgeToEdgeOnMobile />,
};
export const WellOnGray: StoryObj = {
  render: () => <PanelsWellOnGray />,
};
