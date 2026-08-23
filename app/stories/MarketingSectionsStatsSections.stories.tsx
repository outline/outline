import type { Meta, StoryObj } from "@storybook/react";
import { StatsSectionsSimple } from "~/components/StatsSectionsSimple";
import { StatsSectionsSimpleGrid } from "~/components/StatsSectionsSimpleGrid";
import { StatsSectionsSimpleGridOnDark } from "~/components/StatsSectionsSimpleGridOnDark";
import { StatsSectionsSimpleOnDark } from "~/components/StatsSectionsSimpleOnDark";
import { StatsSectionsSplitWithImage } from "~/components/StatsSectionsSplitWithImage";
import { StatsSectionsStepped } from "~/components/StatsSectionsStepped";
import { StatsSectionsTimeline } from "~/components/StatsSectionsTimeline";
import { StatsSectionsWithBackgroundImage } from "~/components/StatsSectionsWithBackgroundImage";
import { StatsSectionsWithDescription } from "~/components/StatsSectionsWithDescription";
import { StatsSectionsWithTwoColumnDescriptionOnDark } from "~/components/StatsSectionsWithTwoColumnDescriptionOnDark";
const meta: Meta = {
  title: "Marketing/Sections/Stats Sections",
};
export default meta;
export const Simple: StoryObj = {
  render: () => <StatsSectionsSimple />,
};
export const SimpleGrid: StoryObj = {
  render: () => <StatsSectionsSimpleGrid />,
};
export const SimpleGridOnDark: StoryObj = {
  render: () => <StatsSectionsSimpleGridOnDark />,
};
export const SimpleOnDark: StoryObj = {
  render: () => <StatsSectionsSimpleOnDark />,
};
export const SplitWithImage: StoryObj = {
  render: () => <StatsSectionsSplitWithImage />,
};
export const Stepped: StoryObj = {
  render: () => <StatsSectionsStepped />,
};
export const Timeline: StoryObj = {
  render: () => <StatsSectionsTimeline />,
};
export const WithBackgroundImage: StoryObj = {
  render: () => <StatsSectionsWithBackgroundImage />,
};
export const WithDescription: StoryObj = {
  render: () => <StatsSectionsWithDescription />,
};
export const WithTwoColumnDescriptionOnDark: StoryObj = {
  render: () => <StatsSectionsWithTwoColumnDescriptionOnDark />,
};
