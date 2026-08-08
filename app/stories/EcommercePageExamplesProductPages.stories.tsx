import type { Meta, StoryObj } from "@storybook/react";
import { ProductPagesWithExpandableProductDetails } from "~/components/ProductPagesWithExpandableProductDetails";
import { ProductPagesWithFeaturedDetails } from "~/components/ProductPagesWithFeaturedDetails";
import { ProductPagesWithImageGrid } from "~/components/ProductPagesWithImageGrid";
import { ProductPagesWithRelatedProducts } from "~/components/ProductPagesWithRelatedProducts";
import { ProductPagesWithTabsAndRelatedProducts } from "~/components/ProductPagesWithTabsAndRelatedProducts";

const meta: Meta = {
  title: "Ecommerce/Page Examples/Product Pages",
};

export default meta;

export const WithExpandableProductDetails: StoryObj = {
  render: () => <ProductPagesWithExpandableProductDetails />,
};

export const WithFeaturedDetails: StoryObj = {
  render: () => <ProductPagesWithFeaturedDetails />,
};

export const WithImageGrid: StoryObj = {
  render: () => <ProductPagesWithImageGrid />,
};

export const WithRelatedProducts: StoryObj = {
  render: () => <ProductPagesWithRelatedProducts />,
};

export const WithTabsAndRelatedProducts: StoryObj = {
  render: () => <ProductPagesWithTabsAndRelatedProducts />,
};
