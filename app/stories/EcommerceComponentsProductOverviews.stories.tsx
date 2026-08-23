import type { Meta, StoryObj } from "@storybook/react";
import { ProductOverviewsSplitWithImage } from "~/components/ProductOverviewsSplitWithImage";
import { ProductOverviewsWithImageGalleryAndExpandableDetails } from "~/components/ProductOverviewsWithImageGalleryAndExpandableDetails";
import { ProductOverviewsWithImageGrid } from "~/components/ProductOverviewsWithImageGrid";
import { ProductOverviewsWithTabs } from "~/components/ProductOverviewsWithTabs";
import { ProductOverviewsWithTieredImages } from "~/components/ProductOverviewsWithTieredImages";
const meta: Meta = {
  title: "Ecommerce/Components/Product Overviews",
};
export default meta;
export const SplitWithImage: StoryObj = {
  render: () => <ProductOverviewsSplitWithImage />,
};
export const WithImageGalleryAndExpandableDetails: StoryObj = {
  render: () => <ProductOverviewsWithImageGalleryAndExpandableDetails />,
};
export const WithImageGrid: StoryObj = {
  render: () => <ProductOverviewsWithImageGrid />,
};
export const WithTabs: StoryObj = {
  render: () => <ProductOverviewsWithTabs />,
};
export const WithTieredImages: StoryObj = {
  render: () => <ProductOverviewsWithTieredImages />,
};
