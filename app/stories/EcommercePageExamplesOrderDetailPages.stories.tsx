import type { Meta, StoryObj } from "@storybook/react";
import { OrderDetailPagesSimpleWithFullOrderDetails } from "~/components/OrderDetailPagesSimpleWithFullOrderDetails";
import { OrderDetailPagesWithLargeImagesAndProgressBars } from "~/components/OrderDetailPagesWithLargeImagesAndProgressBars";
import { OrderDetailPagesWithProgressBars } from "~/components/OrderDetailPagesWithProgressBars";
const meta: Meta = {
  title: "Ecommerce/Page Examples/Order Detail Pages",
};
export default meta;
export const SimpleWithFullOrderDetails: StoryObj = {
  render: () => <OrderDetailPagesSimpleWithFullOrderDetails />,
};
export const WithLargeImagesAndProgressBars: StoryObj = {
  render: () => <OrderDetailPagesWithLargeImagesAndProgressBars />,
};
export const WithProgressBars: StoryObj = {
  render: () => <OrderDetailPagesWithProgressBars />,
};
