import type { Meta, StoryObj } from "@storybook/react";
import { StoreNavigationWithCenteredLogoAndFeaturedCategories } from "~/components/StoreNavigationWithCenteredLogoAndFeaturedCategories";
import { StoreNavigationWithDoubleColumnAndPersistentMobileNav } from "~/components/StoreNavigationWithDoubleColumnAndPersistentMobileNav";
import { StoreNavigationWithFeaturedCategories } from "~/components/StoreNavigationWithFeaturedCategories";
import { StoreNavigationWithImageGrid } from "~/components/StoreNavigationWithImageGrid";
import { StoreNavigationWithSimpleMenuAndPromo } from "~/components/StoreNavigationWithSimpleMenuAndPromo";

const meta: Meta = {
  title: "Ecommerce/Components/Store Navigation",
};

export default meta;

export const WithCenteredLogoAndFeaturedCategories: StoryObj = {
  render: () => <StoreNavigationWithCenteredLogoAndFeaturedCategories />,
};

export const WithDoubleColumnAndPersistentMobileNav: StoryObj = {
  render: () => <StoreNavigationWithDoubleColumnAndPersistentMobileNav />,
};

export const WithFeaturedCategories: StoryObj = {
  render: () => <StoreNavigationWithFeaturedCategories />,
};

export const WithImageGrid: StoryObj = {
  render: () => <StoreNavigationWithImageGrid />,
};

export const WithSimpleMenuAndPromo: StoryObj = {
  render: () => <StoreNavigationWithSimpleMenuAndPromo />,
};
