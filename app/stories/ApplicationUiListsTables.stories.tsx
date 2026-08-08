import type { Meta, StoryObj } from "@storybook/react";
import { TablesFullWidth } from "~/components/TablesFullWidth";
import { TablesFullWidthWithAvatarsOnDark } from "~/components/TablesFullWidthWithAvatarsOnDark";
import { TablesFullWidthWithConstrainedContent } from "~/components/TablesFullWidthWithConstrainedContent";
import { TablesSimple } from "~/components/TablesSimple";
import { TablesSimpleInCard } from "~/components/TablesSimpleInCard";
import { TablesSimpleOnDark } from "~/components/TablesSimpleOnDark";
import { TablesWithAvatarsAndMultiLineContent } from "~/components/TablesWithAvatarsAndMultiLineContent";
import { TablesWithBorder } from "~/components/TablesWithBorder";
import { TablesWithCheckboxes } from "~/components/TablesWithCheckboxes";
import { TablesWithCondensedContent } from "~/components/TablesWithCondensedContent";
import { TablesWithGroupedRows } from "~/components/TablesWithGroupedRows";
import { TablesWithHiddenColumnsOnMobile } from "~/components/TablesWithHiddenColumnsOnMobile";
import { TablesWithHiddenHeadings } from "~/components/TablesWithHiddenHeadings";
import { TablesWithSortableHeadings } from "~/components/TablesWithSortableHeadings";
import { TablesWithStackedColumnsOnMobile } from "~/components/TablesWithStackedColumnsOnMobile";
import { TablesWithStickyHeader } from "~/components/TablesWithStickyHeader";
import { TablesWithStripedRows } from "~/components/TablesWithStripedRows";
import { TablesWithSummaryRows } from "~/components/TablesWithSummaryRows";
import { TablesWithUppercaseHeadings } from "~/components/TablesWithUppercaseHeadings";
import { TablesWithVerticalLines } from "~/components/TablesWithVerticalLines";

const meta: Meta = {
  title: "Application UI/Lists/Tables",
};

export default meta;

export const FullWidth: StoryObj = {
  render: () => <TablesFullWidth />,
};

export const FullWidthWithAvatarsOnDark: StoryObj = {
  render: () => <TablesFullWidthWithAvatarsOnDark />,
};

export const FullWidthWithConstrainedContent: StoryObj = {
  render: () => <TablesFullWidthWithConstrainedContent />,
};

export const Simple: StoryObj = {
  render: () => <TablesSimple />,
};

export const SimpleInCard: StoryObj = {
  render: () => <TablesSimpleInCard />,
};

export const SimpleOnDark: StoryObj = {
  render: () => <TablesSimpleOnDark />,
};

export const WithAvatarsAndMultiLineContent: StoryObj = {
  render: () => <TablesWithAvatarsAndMultiLineContent />,
};

export const WithBorder: StoryObj = {
  render: () => <TablesWithBorder />,
};

export const WithCheckboxes: StoryObj = {
  render: () => <TablesWithCheckboxes />,
};

export const WithCondensedContent: StoryObj = {
  render: () => <TablesWithCondensedContent />,
};

export const WithGroupedRows: StoryObj = {
  render: () => <TablesWithGroupedRows />,
};

export const WithHiddenColumnsOnMobile: StoryObj = {
  render: () => <TablesWithHiddenColumnsOnMobile />,
};

export const WithHiddenHeadings: StoryObj = {
  render: () => <TablesWithHiddenHeadings />,
};

export const WithSortableHeadings: StoryObj = {
  render: () => <TablesWithSortableHeadings />,
};

export const WithStackedColumnsOnMobile: StoryObj = {
  render: () => <TablesWithStackedColumnsOnMobile />,
};

export const WithStickyHeader: StoryObj = {
  render: () => <TablesWithStickyHeader />,
};

export const WithStripedRows: StoryObj = {
  render: () => <TablesWithStripedRows />,
};

export const WithSummaryRows: StoryObj = {
  render: () => <TablesWithSummaryRows />,
};

export const WithUppercaseHeadings: StoryObj = {
  render: () => <TablesWithUppercaseHeadings />,
};

export const WithVerticalLines: StoryObj = {
  render: () => <TablesWithVerticalLines />,
};
