import type { Meta, StoryObj } from "@storybook/react";
import { StackedListsFullWidthWithConstrainedContent } from "~/components/StackedListsFullWidthWithConstrainedContent";
import { StackedListsFullWidthWithLinks } from "~/components/StackedListsFullWidthWithLinks";
import { StackedListsInCardWithLinks } from "~/components/StackedListsInCardWithLinks";
import { StackedListsNarrow } from "~/components/StackedListsNarrow";
import { StackedListsNarrowWithActions } from "~/components/StackedListsNarrowWithActions";
import { StackedListsNarrowWithBadgesOnDark } from "~/components/StackedListsNarrowWithBadgesOnDark";
import { StackedListsNarrowWithSmallAvatars } from "~/components/StackedListsNarrowWithSmallAvatars";
import { StackedListsNarrowWithSmallAvatarsOnDark } from "~/components/StackedListsNarrowWithSmallAvatarsOnDark";
import { StackedListsNarrowWithStickyHeadings } from "~/components/StackedListsNarrowWithStickyHeadings";
import { StackedListsNarrowWithTruncatedContent } from "~/components/StackedListsNarrowWithTruncatedContent";
import { StackedListsSimple } from "~/components/StackedListsSimple";
import { StackedListsSimpleOnDark } from "~/components/StackedListsSimpleOnDark";
import { StackedListsTwoColumnsWithLinks } from "~/components/StackedListsTwoColumnsWithLinks";
import { StackedListsWithBadgesButtonAndActionsMenu } from "~/components/StackedListsWithBadgesButtonAndActionsMenu";
import { StackedListsWithInlineLinksAndActionsMenu } from "~/components/StackedListsWithInlineLinksAndActionsMenu";
import { StackedListsWithInlineLinksAndAvatarGroup } from "~/components/StackedListsWithInlineLinksAndAvatarGroup";
import { StackedListsWithLinks } from "~/components/StackedListsWithLinks";

const meta: Meta = {
  title: "Application UI/Lists/Stacked Lists",
};

export default meta;

export const FullWidthWithConstrainedContent: StoryObj = {
  render: () => <StackedListsFullWidthWithConstrainedContent />,
};

export const FullWidthWithLinks: StoryObj = {
  render: () => <StackedListsFullWidthWithLinks />,
};

export const InCardWithLinks: StoryObj = {
  render: () => <StackedListsInCardWithLinks />,
};

export const Narrow: StoryObj = {
  render: () => <StackedListsNarrow />,
};

export const NarrowWithActions: StoryObj = {
  render: () => <StackedListsNarrowWithActions />,
};

export const NarrowWithBadgesOnDark: StoryObj = {
  render: () => <StackedListsNarrowWithBadgesOnDark />,
};

export const NarrowWithSmallAvatars: StoryObj = {
  render: () => <StackedListsNarrowWithSmallAvatars />,
};

export const NarrowWithSmallAvatarsOnDark: StoryObj = {
  render: () => <StackedListsNarrowWithSmallAvatarsOnDark />,
};

export const NarrowWithStickyHeadings: StoryObj = {
  render: () => <StackedListsNarrowWithStickyHeadings />,
};

export const NarrowWithTruncatedContent: StoryObj = {
  render: () => <StackedListsNarrowWithTruncatedContent />,
};

export const Simple: StoryObj = {
  render: () => <StackedListsSimple />,
};

export const SimpleOnDark: StoryObj = {
  render: () => <StackedListsSimpleOnDark />,
};

export const TwoColumnsWithLinks: StoryObj = {
  render: () => <StackedListsTwoColumnsWithLinks />,
};

export const WithBadgesButtonAndActionsMenu: StoryObj = {
  render: () => <StackedListsWithBadgesButtonAndActionsMenu />,
};

export const WithInlineLinksAndActionsMenu: StoryObj = {
  render: () => <StackedListsWithInlineLinksAndActionsMenu />,
};

export const WithInlineLinksAndAvatarGroup: StoryObj = {
  render: () => <StackedListsWithInlineLinksAndAvatarGroup />,
};

export const WithLinks: StoryObj = {
  render: () => <StackedListsWithLinks />,
};
