import type { Meta, StoryObj } from "@storybook/react";
import { ProductFeaturesWithAlternatingSections } from "~/components/ProductFeaturesWithAlternatingSections";
import { ProductFeaturesWithFadingImage } from "~/components/ProductFeaturesWithFadingImage";
import { ProductFeaturesWithHeaderImagesAndDescriptions } from "~/components/ProductFeaturesWithHeaderImagesAndDescriptions";
import { ProductFeaturesWithImageGrid } from "~/components/ProductFeaturesWithImageGrid";
import { ProductFeaturesWithSplitImage } from "~/components/ProductFeaturesWithSplitImage";
import { ProductFeaturesWithSquareImages } from "~/components/ProductFeaturesWithSquareImages";
import { ProductFeaturesWithTabs } from "~/components/ProductFeaturesWithTabs";
import { ProductFeaturesWithTieredImages } from "~/components/ProductFeaturesWithTieredImages";
import { ProductFeaturesWithWideImages } from "~/components/ProductFeaturesWithWideImages";

const meta: Meta = {
  title: "Ecommerce/Components/Product Features",
};

export default meta;

export const WithAlternatingSections: StoryObj = {
  render: () => <ProductFeaturesWithAlternatingSections />,
};

export const WithFadingImage: StoryObj = {
  render: () => <ProductFeaturesWithFadingImage />,
};

export const WithHeaderImagesAndDescriptions: StoryObj = {
  render: () => <ProductFeaturesWithHeaderImagesAndDescriptions />,
};

export const WithImageGrid: StoryObj = {
  render: () => <ProductFeaturesWithImageGrid />,
};

export const WithSplitImage: StoryObj = {
  render: () => <ProductFeaturesWithSplitImage />,
};

export const WithSquareImages: StoryObj = {
  render: () => <ProductFeaturesWithSquareImages />,
};

export const WithTabs: StoryObj = {
  render: () => <ProductFeaturesWithTabs />,
};

export const WithTieredImages: StoryObj = {
  render: () => <ProductFeaturesWithTieredImages />,
};

export const WithWideImages: StoryObj = {
  render: () => <ProductFeaturesWithWideImages />,
};
