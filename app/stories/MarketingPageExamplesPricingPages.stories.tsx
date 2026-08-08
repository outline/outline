import type { Meta, StoryObj } from "@storybook/react";
import { PricingPagesWithComparisonTable } from "~/components/PricingPagesWithComparisonTable";
import { PricingPagesWithFourTiers } from "~/components/PricingPagesWithFourTiers";
import { PricingPagesWithThreeTiersAndTestimonials } from "~/components/PricingPagesWithThreeTiersAndTestimonials";

const meta: Meta = {
  title: "Marketing/Page Examples/Pricing Pages",
};

export default meta;

export const WithComparisonTable: StoryObj = {
  render: () => <PricingPagesWithComparisonTable />,
};

export const WithFourTiers: StoryObj = {
  render: () => <PricingPagesWithFourTiers />,
};

export const WithThreeTiersAndTestimonials: StoryObj = {
  render: () => <PricingPagesWithThreeTiersAndTestimonials />,
};
