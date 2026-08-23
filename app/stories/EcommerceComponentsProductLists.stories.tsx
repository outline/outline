import type { Meta, StoryObj } from "@storybook/react";
import { ProductListsCardWithFullDetails } from "~/components/ProductListsCardWithFullDetails";
import { ProductListsSimple } from "~/components/ProductListsSimple";
import { ProductListsWithBorderGrid } from "~/components/ProductListsWithBorderGrid";
import { ProductListsWithColorSwatchesAndHorizontalScrolling } from "~/components/ProductListsWithColorSwatchesAndHorizontalScrolling";
import { ProductListsWithCtaLink } from "~/components/ProductListsWithCtaLink";
import { ProductListsWithImageOverlayAndAddButton } from "~/components/ProductListsWithImageOverlayAndAddButton";
import { ProductListsWithInlinePrice } from "~/components/ProductListsWithInlinePrice";
import { ProductListsWithInlinePriceAndCtaLink } from "~/components/ProductListsWithInlinePriceAndCtaLink";
import { ProductListsWithSupportingText } from "~/components/ProductListsWithSupportingText";
import { ProductListsWithTallImages } from "~/components/ProductListsWithTallImages";
import { ProductListsWithTallImagesAndCtaLink } from "~/components/ProductListsWithTallImagesAndCtaLink";
const meta: Meta = {
  title: "Ecommerce/Components/Product Lists",
};
export default meta;
export const CardWithFullDetails: StoryObj = {
  render: () => <ProductListsCardWithFullDetails />,
};
export const Simple: StoryObj = {
  render: () => <ProductListsSimple />,
};
export const WithBorderGrid: StoryObj = {
  render: () => <ProductListsWithBorderGrid />,
};
export const WithColorSwatchesAndHorizontalScrolling: StoryObj = {
  render: () => <ProductListsWithColorSwatchesAndHorizontalScrolling />,
};
export const WithCtaLink: StoryObj = {
  render: () => <ProductListsWithCtaLink />,
};
export const WithImageOverlayAndAddButton: StoryObj = {
  render: () => <ProductListsWithImageOverlayAndAddButton />,
};
export const WithInlinePrice: StoryObj = {
  render: () => <ProductListsWithInlinePrice />,
};
export const WithInlinePriceAndCtaLink: StoryObj = {
  render: () => <ProductListsWithInlinePriceAndCtaLink />,
};
export const WithSupportingText: StoryObj = {
  render: () => <ProductListsWithSupportingText />,
};
export const WithTallImages: StoryObj = {
  render: () => <ProductListsWithTallImages />,
};
export const WithTallImagesAndCtaLink: StoryObj = {
  render: () => <ProductListsWithTallImagesAndCtaLink />,
};
