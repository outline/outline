import type { Meta, StoryObj } from "@storybook/react";
import { ShoppingCartsModal } from "~/components/ShoppingCartsModal";
import { ShoppingCartsPopover } from "~/components/ShoppingCartsPopover";
import { ShoppingCartsSingleColumn } from "~/components/ShoppingCartsSingleColumn";
import { ShoppingCartsSlideOver } from "~/components/ShoppingCartsSlideOver";
import { ShoppingCartsTwoColumnWithQuantityDropdown } from "~/components/ShoppingCartsTwoColumnWithQuantityDropdown";
import { ShoppingCartsWithExtendedSummary } from "~/components/ShoppingCartsWithExtendedSummary";

const meta: Meta = {
  title: "Ecommerce/Components/Shopping Carts",
};

export default meta;

export const Modal: StoryObj = {
  render: () => <ShoppingCartsModal />,
};

export const Popover: StoryObj = {
  render: () => <ShoppingCartsPopover />,
};

export const SingleColumn: StoryObj = {
  render: () => <ShoppingCartsSingleColumn />,
};

export const SlideOver: StoryObj = {
  render: () => <ShoppingCartsSlideOver />,
};

export const TwoColumnWithQuantityDropdown: StoryObj = {
  render: () => <ShoppingCartsTwoColumnWithQuantityDropdown />,
};

export const WithExtendedSummary: StoryObj = {
  render: () => <ShoppingCartsWithExtendedSummary />,
};
