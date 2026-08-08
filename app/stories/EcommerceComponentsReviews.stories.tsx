import type { Meta, StoryObj } from "@storybook/react";
import { ReviewsAvatarsWithSeparateDescription } from "~/components/ReviewsAvatarsWithSeparateDescription";
import { ReviewsMultiColumn } from "~/components/ReviewsMultiColumn";
import { ReviewsSimpleWithAvatars } from "~/components/ReviewsSimpleWithAvatars";
import { ReviewsWithSummaryChart } from "~/components/ReviewsWithSummaryChart";

const meta: Meta = {
  title: "Ecommerce/Components/Reviews",
};

export default meta;

export const AvatarsWithSeparateDescription: StoryObj = {
  render: () => <ReviewsAvatarsWithSeparateDescription />,
};

export const MultiColumn: StoryObj = {
  render: () => <ReviewsMultiColumn />,
};

export const SimpleWithAvatars: StoryObj = {
  render: () => <ReviewsSimpleWithAvatars />,
};

export const WithSummaryChart: StoryObj = {
  render: () => <ReviewsWithSummaryChart />,
};
