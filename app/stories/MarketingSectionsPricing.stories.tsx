import type { Meta, StoryObj } from "@storybook/react";
import { PricingFourTiersWithToggle } from "~/components/PricingFourTiersWithToggle";
import { PricingSinglePriceWithDetails } from "~/components/PricingSinglePriceWithDetails";
import { PricingThreeTiers } from "~/components/PricingThreeTiers";
import { PricingThreeTiersWithDividers } from "~/components/PricingThreeTiersWithDividers";
import { PricingThreeTiersWithEmphasizedTier } from "~/components/PricingThreeTiersWithEmphasizedTier";
import { PricingThreeTiersWithFeatureComparison } from "~/components/PricingThreeTiersWithFeatureComparison";
import { PricingThreeTiersWithToggle } from "~/components/PricingThreeTiersWithToggle";
import { PricingThreeTiersWithToggleOnDark } from "~/components/PricingThreeTiersWithToggleOnDark";
import { PricingTwoTiers } from "~/components/PricingTwoTiers";
import { PricingTwoTiersWithEmphasizedTier } from "~/components/PricingTwoTiersWithEmphasizedTier";
import { PricingTwoTiersWithExtraTier } from "~/components/PricingTwoTiersWithExtraTier";
import { PricingWithComparisonTable } from "~/components/PricingWithComparisonTable";
import { PricingWithComparisonTableOnDark } from "~/components/PricingWithComparisonTableOnDark";

const meta: Meta = {
  title: "Marketing/Sections/Pricing",
};

export default meta;

export const FourTiersWithToggle: StoryObj = {
  render: () => <PricingFourTiersWithToggle />,
};

export const SinglePriceWithDetails: StoryObj = {
  render: () => <PricingSinglePriceWithDetails />,
};

export const ThreeTiers: StoryObj = {
  render: () => <PricingThreeTiers />,
};

export const ThreeTiersWithDividers: StoryObj = {
  render: () => <PricingThreeTiersWithDividers />,
};

export const ThreeTiersWithEmphasizedTier: StoryObj = {
  render: () => <PricingThreeTiersWithEmphasizedTier />,
};

export const ThreeTiersWithFeatureComparison: StoryObj = {
  render: () => <PricingThreeTiersWithFeatureComparison />,
};

export const ThreeTiersWithToggle: StoryObj = {
  render: () => <PricingThreeTiersWithToggle />,
};

export const ThreeTiersWithToggleOnDark: StoryObj = {
  render: () => <PricingThreeTiersWithToggleOnDark />,
};

export const TwoTiers: StoryObj = {
  render: () => <PricingTwoTiers />,
};

export const TwoTiersWithEmphasizedTier: StoryObj = {
  render: () => <PricingTwoTiersWithEmphasizedTier />,
};

export const TwoTiersWithExtraTier: StoryObj = {
  render: () => <PricingTwoTiersWithExtraTier />,
};

export const WithComparisonTable: StoryObj = {
  render: () => <PricingWithComparisonTable />,
};

export const WithComparisonTableOnDark: StoryObj = {
  render: () => <PricingWithComparisonTableOnDark />,
};
