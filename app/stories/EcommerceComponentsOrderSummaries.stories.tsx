import type { Meta, StoryObj } from "@storybook/react";
import { OrderSummariesSimpleWithFullOrderDetails } from "~/components/OrderSummariesSimpleWithFullOrderDetails";
import { OrderSummariesWithLargeImagesAndProgressBars } from "~/components/OrderSummariesWithLargeImagesAndProgressBars";
import { OrderSummariesWithProgressBars } from "~/components/OrderSummariesWithProgressBars";
import { OrderSummariesWithSplitImage } from "~/components/OrderSummariesWithSplitImage";
const meta: Meta = {
  title: "Ecommerce/Components/Order Summaries",
};
export default meta;
export const SimpleWithFullOrderDetails: StoryObj = {
  render: () => <OrderSummariesSimpleWithFullOrderDetails />,
};
export const WithLargeImagesAndProgressBars: StoryObj = {
  render: () => <OrderSummariesWithLargeImagesAndProgressBars />,
};
export const WithProgressBars: StoryObj = {
  render: () => <OrderSummariesWithProgressBars />,
};
export const WithSplitImage: StoryObj = {
  render: () => <OrderSummariesWithSplitImage />,
};
