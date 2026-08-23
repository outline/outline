import type { Meta, StoryObj } from "@storybook/react";
import { LandingPagesWithBackgroundImageHeroAndPricingSection } from "~/components/LandingPagesWithBackgroundImageHeroAndPricingSection";
import { LandingPagesWithLargeScreenshotAndTestimonial } from "~/components/LandingPagesWithLargeScreenshotAndTestimonial";
import { LandingPagesWithMobileScreenshotAndTestimonialsGrid } from "~/components/LandingPagesWithMobileScreenshotAndTestimonialsGrid";
import { LandingPagesWithScreenshotsAndStats } from "~/components/LandingPagesWithScreenshotsAndStats";
const meta: Meta = {
  title: "Marketing/Page Examples/Landing Pages",
};
export default meta;
export const WithBackgroundImageHeroAndPricingSection: StoryObj = {
  render: () => <LandingPagesWithBackgroundImageHeroAndPricingSection />,
};
export const WithLargeScreenshotAndTestimonial: StoryObj = {
  render: () => <LandingPagesWithLargeScreenshotAndTestimonial />,
};
export const WithMobileScreenshotAndTestimonialsGrid: StoryObj = {
  render: () => <LandingPagesWithMobileScreenshotAndTestimonialsGrid />,
};
export const WithScreenshotsAndStats: StoryObj = {
  render: () => <LandingPagesWithScreenshotsAndStats />,
};
