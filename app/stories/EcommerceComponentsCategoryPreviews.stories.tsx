import type { Meta, StoryObj } from "@storybook/react";
import { CategoryPreviewsThreeColumn } from "~/components/CategoryPreviewsThreeColumn";
import { CategoryPreviewsThreeColumnWithDescription } from "~/components/CategoryPreviewsThreeColumnWithDescription";
import { CategoryPreviewsWithBackgroundImageAndDetailOverlay } from "~/components/CategoryPreviewsWithBackgroundImageAndDetailOverlay";
import { CategoryPreviewsWithImageBackgrounds } from "~/components/CategoryPreviewsWithImageBackgrounds";
import { CategoryPreviewsWithScrollingCards } from "~/components/CategoryPreviewsWithScrollingCards";
import { CategoryPreviewsWithSplitImages } from "~/components/CategoryPreviewsWithSplitImages";

const meta: Meta = {
  title: "Ecommerce/Components/Category Previews",
};

export default meta;

export const ThreeColumn: StoryObj = {
  render: () => <CategoryPreviewsThreeColumn />,
};

export const ThreeColumnWithDescription: StoryObj = {
  render: () => <CategoryPreviewsThreeColumnWithDescription />,
};

export const WithBackgroundImageAndDetailOverlay: StoryObj = {
  render: () => <CategoryPreviewsWithBackgroundImageAndDetailOverlay />,
};

export const WithImageBackgrounds: StoryObj = {
  render: () => <CategoryPreviewsWithImageBackgrounds />,
};

export const WithScrollingCards: StoryObj = {
  render: () => <CategoryPreviewsWithScrollingCards />,
};

export const WithSplitImages: StoryObj = {
  render: () => <CategoryPreviewsWithSplitImages />,
};
