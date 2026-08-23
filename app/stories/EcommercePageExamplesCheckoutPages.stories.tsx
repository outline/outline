import type { Meta, StoryObj } from "@storybook/react";
import { CheckoutPagesMultiStep } from "~/components/CheckoutPagesMultiStep";
import { CheckoutPagesSingleStepWithOrderSummary } from "~/components/CheckoutPagesSingleStepWithOrderSummary";
import { CheckoutPagesSplitWithOrderSummary } from "~/components/CheckoutPagesSplitWithOrderSummary";
import { CheckoutPagesWithMobileOrderSummaryOverlay } from "~/components/CheckoutPagesWithMobileOrderSummaryOverlay";
import { CheckoutPagesWithOrderSummarySidebar } from "~/components/CheckoutPagesWithOrderSummarySidebar";
const meta: Meta = {
  title: "Ecommerce/Page Examples/Checkout Pages",
};
export default meta;
export const MultiStep: StoryObj = {
  render: () => <CheckoutPagesMultiStep />,
};
export const SingleStepWithOrderSummary: StoryObj = {
  render: () => <CheckoutPagesSingleStepWithOrderSummary />,
};
export const SplitWithOrderSummary: StoryObj = {
  render: () => <CheckoutPagesSplitWithOrderSummary />,
};
export const WithMobileOrderSummaryOverlay: StoryObj = {
  render: () => <CheckoutPagesWithMobileOrderSummaryOverlay />,
};
export const WithOrderSummarySidebar: StoryObj = {
  render: () => <CheckoutPagesWithOrderSummarySidebar />,
};
