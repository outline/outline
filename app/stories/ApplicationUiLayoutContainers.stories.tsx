import type { Meta, StoryObj } from "@storybook/react";
import { ContainersConstrainedToBreakpointWithPaddedContent } from "~/components/ContainersConstrainedToBreakpointWithPaddedContent";
import { ContainersConstrainedWithPaddedContent } from "~/components/ContainersConstrainedWithPaddedContent";
import { ContainersFullWidthOnMobileConstrainedToBreakpointWithPaddedContentAboveMobile } from "~/components/ContainersFullWidthOnMobileConstrainedToBreakpointWithPaddedContentAboveMobile";
import { ContainersFullWidthOnMobileConstrainedWithPaddedContentAbove } from "~/components/ContainersFullWidthOnMobileConstrainedWithPaddedContentAbove";
import { ContainersNarrowConstrainedWithPaddedContent } from "~/components/ContainersNarrowConstrainedWithPaddedContent";
const meta: Meta = {
  title: "Application UI/Layout/Containers",
};
export default meta;
export const ConstrainedToBreakpointWithPaddedContent: StoryObj = {
  render: () => <ContainersConstrainedToBreakpointWithPaddedContent />,
};
export const ConstrainedWithPaddedContent: StoryObj = {
  render: () => <ContainersConstrainedWithPaddedContent />,
};
export const FullWidthOnMobileConstrainedToBreakpointWithPaddedContentAboveMobile: StoryObj =
  {
    render: () => (
      <ContainersFullWidthOnMobileConstrainedToBreakpointWithPaddedContentAboveMobile />
    ),
  };
export const FullWidthOnMobileConstrainedWithPaddedContentAbove: StoryObj = {
  render: () => (
    <ContainersFullWidthOnMobileConstrainedWithPaddedContentAbove />
  ),
};
export const NarrowConstrainedWithPaddedContent: StoryObj = {
  render: () => <ContainersNarrowConstrainedWithPaddedContent />,
};
