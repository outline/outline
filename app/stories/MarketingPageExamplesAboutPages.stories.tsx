import type { Meta, StoryObj } from "@storybook/react";
import { AboutPagesDark } from "~/components/AboutPagesDark";
import { AboutPagesWithImageTiles } from "~/components/AboutPagesWithImageTiles";
import { AboutPagesWithTimelineAndStats } from "~/components/AboutPagesWithTimelineAndStats";

const meta: Meta = {
  title: "Marketing/Page Examples/About Pages",
};

export default meta;

export const Dark: StoryObj = {
  render: () => <AboutPagesDark />,
};

export const WithImageTiles: StoryObj = {
  render: () => <AboutPagesWithImageTiles />,
};

export const WithTimelineAndStats: StoryObj = {
  render: () => <AboutPagesWithTimelineAndStats />,
};
