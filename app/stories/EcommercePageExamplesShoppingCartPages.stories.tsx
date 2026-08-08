import type { Meta, StoryObj } from "@storybook/react";
import { ShoppingCartPagesSimpleWithPolicyGrid } from "~/components/ShoppingCartPagesSimpleWithPolicyGrid";
import { ShoppingCartPagesWithPolicyGridAndExtendedSummary } from "~/components/ShoppingCartPagesWithPolicyGridAndExtendedSummary";
import { ShoppingCartPagesWithRelatedProducts } from "~/components/ShoppingCartPagesWithRelatedProducts";

const meta: Meta = {
  title: "Ecommerce/Page Examples/Shopping Cart Pages",
};

export default meta;

export const SimpleWithPolicyGrid: StoryObj = {
  render: () => <ShoppingCartPagesSimpleWithPolicyGrid />,
};

export const WithPolicyGridAndExtendedSummary: StoryObj = {
  render: () => <ShoppingCartPagesWithPolicyGridAndExtendedSummary />,
};

export const WithRelatedProducts: StoryObj = {
  render: () => <ShoppingCartPagesWithRelatedProducts />,
};
