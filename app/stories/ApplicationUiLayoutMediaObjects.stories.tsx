import type { Meta, StoryObj } from "@storybook/react";
import { MediaObjectsAlignedToBottom } from "~/components/MediaObjectsAlignedToBottom";
import { MediaObjectsAlignedToCenter } from "~/components/MediaObjectsAlignedToCenter";
import { MediaObjectsBasic } from "~/components/MediaObjectsBasic";
import { MediaObjectsBasicResponsive } from "~/components/MediaObjectsBasicResponsive";
import { MediaObjectsMediaOnRight } from "~/components/MediaObjectsMediaOnRight";
import { MediaObjectsNested } from "~/components/MediaObjectsNested";
import { MediaObjectsStretchedToFit } from "~/components/MediaObjectsStretchedToFit";
import { MediaObjectsWideResponsive } from "~/components/MediaObjectsWideResponsive";

const meta: Meta = {
  title: "Application UI/Layout/Media Objects",
};

export default meta;

export const AlignedToBottom: StoryObj = {
  render: () => <MediaObjectsAlignedToBottom />,
};

export const AlignedToCenter: StoryObj = {
  render: () => <MediaObjectsAlignedToCenter />,
};

export const Basic: StoryObj = {
  render: () => <MediaObjectsBasic />,
};

export const BasicResponsive: StoryObj = {
  render: () => <MediaObjectsBasicResponsive />,
};

export const MediaOnRight: StoryObj = {
  render: () => <MediaObjectsMediaOnRight />,
};

export const Nested: StoryObj = {
  render: () => <MediaObjectsNested />,
};

export const StretchedToFit: StoryObj = {
  render: () => <MediaObjectsStretchedToFit />,
};

export const WideResponsive: StoryObj = {
  render: () => <MediaObjectsWideResponsive />,
};
