import type { Meta, StoryObj } from "@storybook/react";
import { MultiColumnConstrainedThreeColumn } from "~/components/MultiColumnConstrainedThreeColumn";
import { MultiColumnConstrainedWithStickyColumns } from "~/components/MultiColumnConstrainedWithStickyColumns";
import { MultiColumnFullWidthSecondaryColumnOnRight } from "~/components/MultiColumnFullWidthSecondaryColumnOnRight";
import { MultiColumnFullWidthThreeColumn } from "~/components/MultiColumnFullWidthThreeColumn";
import { MultiColumnFullWidthWithNarrowSidebar } from "~/components/MultiColumnFullWidthWithNarrowSidebar";
import { MultiColumnFullWidthWithNarrowSidebarAndHeader } from "~/components/MultiColumnFullWidthWithNarrowSidebarAndHeader";
const meta: Meta = {
  title: "Application UI/Application Shells/Multi Column",
};
export default meta;
export const ConstrainedThreeColumn: StoryObj = {
  render: () => <MultiColumnConstrainedThreeColumn />,
};
export const ConstrainedWithStickyColumns: StoryObj = {
  render: () => <MultiColumnConstrainedWithStickyColumns />,
};
export const FullWidthSecondaryColumnOnRight: StoryObj = {
  render: () => <MultiColumnFullWidthSecondaryColumnOnRight />,
};
export const FullWidthThreeColumn: StoryObj = {
  render: () => <MultiColumnFullWidthThreeColumn />,
};
export const FullWidthWithNarrowSidebar: StoryObj = {
  render: () => <MultiColumnFullWidthWithNarrowSidebar />,
};
export const FullWidthWithNarrowSidebarAndHeader: StoryObj = {
  render: () => <MultiColumnFullWidthWithNarrowSidebarAndHeader />,
};
