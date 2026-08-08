import type { Meta, StoryObj } from "@storybook/react";
import { DescriptionListsLeftAligned } from "~/components/DescriptionListsLeftAligned";
import { DescriptionListsLeftAlignedInCard } from "~/components/DescriptionListsLeftAlignedInCard";
import { DescriptionListsLeftAlignedOnDark } from "~/components/DescriptionListsLeftAlignedOnDark";
import { DescriptionListsLeftAlignedStriped } from "~/components/DescriptionListsLeftAlignedStriped";
import { DescriptionListsLeftAlignedWithInlineActions } from "~/components/DescriptionListsLeftAlignedWithInlineActions";
import { DescriptionListsNarrowWithHiddenLabels } from "~/components/DescriptionListsNarrowWithHiddenLabels";
import { DescriptionListsTwoColumn } from "~/components/DescriptionListsTwoColumn";

const meta: Meta = {
  title: "Application UI/Data Display/Description Lists",
};

export default meta;

export const LeftAligned: StoryObj = {
  render: () => <DescriptionListsLeftAligned />,
};

export const LeftAlignedInCard: StoryObj = {
  render: () => <DescriptionListsLeftAlignedInCard />,
};

export const LeftAlignedOnDark: StoryObj = {
  render: () => <DescriptionListsLeftAlignedOnDark />,
};

export const LeftAlignedStriped: StoryObj = {
  render: () => <DescriptionListsLeftAlignedStriped />,
};

export const LeftAlignedWithInlineActions: StoryObj = {
  render: () => <DescriptionListsLeftAlignedWithInlineActions />,
};

export const NarrowWithHiddenLabels: StoryObj = {
  render: () => <DescriptionListsNarrowWithHiddenLabels />,
};

export const TwoColumn: StoryObj = {
  render: () => <DescriptionListsTwoColumn />,
};
