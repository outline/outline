import type { Meta, StoryObj } from "@storybook/react";
import { PromoSectionsFullWidthWithBackgroundImage } from "~/components/PromoSectionsFullWidthWithBackgroundImage";
import { PromoSectionsFullWidthWithBackgroundImageAndLargeContent } from "~/components/PromoSectionsFullWidthWithBackgroundImageAndLargeContent";
import { PromoSectionsFullWidthWithOverlappingImageTiles } from "~/components/PromoSectionsFullWidthWithOverlappingImageTiles";
import { PromoSectionsWithBackgroundImage } from "~/components/PromoSectionsWithBackgroundImage";
import { PromoSectionsWithFadingBackgroundImageAndTestimonials } from "~/components/PromoSectionsWithFadingBackgroundImageAndTestimonials";
import { PromoSectionsWithImageTiles } from "~/components/PromoSectionsWithImageTiles";
import { PromoSectionsWithOffersAndSplitImage } from "~/components/PromoSectionsWithOffersAndSplitImage";
import { PromoSectionsWithOverlappingImageTiles } from "~/components/PromoSectionsWithOverlappingImageTiles";
const meta: Meta = {
  title: "Ecommerce/Components/Promo Sections",
};
export default meta;
export const FullWidthWithBackgroundImage: StoryObj = {
  render: () => <PromoSectionsFullWidthWithBackgroundImage />,
};
export const FullWidthWithBackgroundImageAndLargeContent: StoryObj = {
  render: () => <PromoSectionsFullWidthWithBackgroundImageAndLargeContent />,
};
export const FullWidthWithOverlappingImageTiles: StoryObj = {
  render: () => <PromoSectionsFullWidthWithOverlappingImageTiles />,
};
export const WithBackgroundImage: StoryObj = {
  render: () => <PromoSectionsWithBackgroundImage />,
};
export const WithFadingBackgroundImageAndTestimonials: StoryObj = {
  render: () => <PromoSectionsWithFadingBackgroundImageAndTestimonials />,
};
export const WithImageTiles: StoryObj = {
  render: () => <PromoSectionsWithImageTiles />,
};
export const WithOffersAndSplitImage: StoryObj = {
  render: () => <PromoSectionsWithOffersAndSplitImage />,
};
export const WithOverlappingImageTiles: StoryObj = {
  render: () => <PromoSectionsWithOverlappingImageTiles />,
};
