import type { Meta, StoryObj } from "@storybook/react";
import { ProductQuickviewsWithColorAndSizeSelector } from "~/components/ProductQuickviewsWithColorAndSizeSelector";
import { ProductQuickviewsWithColorSelectorAndDescription } from "~/components/ProductQuickviewsWithColorSelectorAndDescription";
import { ProductQuickviewsWithColorSelectorSizeSelectorAndDetailsLink } from "~/components/ProductQuickviewsWithColorSelectorSizeSelectorAndDetailsLink";
import { ProductQuickviewsWithLargeSizeSelector } from "~/components/ProductQuickviewsWithLargeSizeSelector";

const meta: Meta = {
  title: "Ecommerce/Components/Product Quickviews",
};

export default meta;

export const WithColorAndSizeSelector: StoryObj = {
  render: () => <ProductQuickviewsWithColorAndSizeSelector />,
};

export const WithColorSelectorAndDescription: StoryObj = {
  render: () => <ProductQuickviewsWithColorSelectorAndDescription />,
};

export const WithColorSelectorSizeSelectorAndDetailsLink: StoryObj = {
  render: () => (
    <ProductQuickviewsWithColorSelectorSizeSelectorAndDetailsLink />
  ),
};

export const WithLargeSizeSelector: StoryObj = {
  render: () => <ProductQuickviewsWithLargeSizeSelector />,
};
