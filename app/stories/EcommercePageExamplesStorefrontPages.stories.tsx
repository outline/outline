import type { Meta, StoryObj } from "@storybook/react";
import { StorefrontPagesWithDarkNavAndFooter } from "~/components/StorefrontPagesWithDarkNavAndFooter";
import { StorefrontPagesWithImageTilesAndFeatureSections } from "~/components/StorefrontPagesWithImageTilesAndFeatureSections";
import { StorefrontPagesWithOffersAndTestimonials } from "~/components/StorefrontPagesWithOffersAndTestimonials";
import { StorefrontPagesWithOverlappingImageTilesAndPerks } from "~/components/StorefrontPagesWithOverlappingImageTilesAndPerks";

const meta: Meta = {
  title: "Ecommerce/Page Examples/Storefront Pages",
};

export default meta;

export const WithDarkNavAndFooter: StoryObj = {
  render: () => <StorefrontPagesWithDarkNavAndFooter />,
};

export const WithImageTilesAndFeatureSections: StoryObj = {
  render: () => <StorefrontPagesWithImageTilesAndFeatureSections />,
};

export const WithOffersAndTestimonials: StoryObj = {
  render: () => <StorefrontPagesWithOffersAndTestimonials />,
};

export const WithOverlappingImageTilesAndPerks: StoryObj = {
  render: () => <StorefrontPagesWithOverlappingImageTilesAndPerks />,
};
