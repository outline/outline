import type { Meta, StoryObj } from "@storybook/react";
import { EmptyStatesSimple } from "~/components/EmptyStatesSimple";
import { EmptyStatesWithDashedBorder } from "~/components/EmptyStatesWithDashedBorder";
import { EmptyStatesWithRecommendations } from "~/components/EmptyStatesWithRecommendations";
import { EmptyStatesWithRecommendationsGrid } from "~/components/EmptyStatesWithRecommendationsGrid";
import { EmptyStatesWithStartingPoints } from "~/components/EmptyStatesWithStartingPoints";
import { EmptyStatesWithTemplates } from "~/components/EmptyStatesWithTemplates";
const meta: Meta = {
  title: "Application UI/Feedback/Empty States",
};
export default meta;
export const Simple: StoryObj = {
  render: () => <EmptyStatesSimple />,
};
export const WithDashedBorder: StoryObj = {
  render: () => <EmptyStatesWithDashedBorder />,
};
export const WithRecommendations: StoryObj = {
  render: () => <EmptyStatesWithRecommendations />,
};
export const WithRecommendationsGrid: StoryObj = {
  render: () => <EmptyStatesWithRecommendationsGrid />,
};
export const WithStartingPoints: StoryObj = {
  render: () => <EmptyStatesWithStartingPoints />,
};
export const WithTemplates: StoryObj = {
  render: () => <EmptyStatesWithTemplates />,
};
