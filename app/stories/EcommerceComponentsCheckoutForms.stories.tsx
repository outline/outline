import type { Meta, StoryObj } from "@storybook/react";
import { CheckoutFormsMultiStep } from "~/components/CheckoutFormsMultiStep";
import { CheckoutFormsSingleStepWithOrderSummary } from "~/components/CheckoutFormsSingleStepWithOrderSummary";
import { CheckoutFormsSplitWithOrderSummary } from "~/components/CheckoutFormsSplitWithOrderSummary";
import { CheckoutFormsWithMobileOrderSummaryOverlay } from "~/components/CheckoutFormsWithMobileOrderSummaryOverlay";
import { CheckoutFormsWithOrderSummarySidebar } from "~/components/CheckoutFormsWithOrderSummarySidebar";
const meta: Meta = {
  title: "Ecommerce/Components/Checkout Forms",
};
export default meta;
export const MultiStep: StoryObj = {
  render: () => <CheckoutFormsMultiStep />,
};
export const SingleStepWithOrderSummary: StoryObj = {
  render: () => <CheckoutFormsSingleStepWithOrderSummary />,
};
export const SplitWithOrderSummary: StoryObj = {
  render: () => <CheckoutFormsSplitWithOrderSummary />,
};
export const WithMobileOrderSummaryOverlay: StoryObj = {
  render: () => <CheckoutFormsWithMobileOrderSummaryOverlay />,
};
export const WithOrderSummarySidebar: StoryObj = {
  render: () => <CheckoutFormsWithOrderSummarySidebar />,
};
