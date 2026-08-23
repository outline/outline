import type { Meta, StoryObj } from "@storybook/react";
import { CategoryFiltersSidebarFilters } from "~/components/CategoryFiltersSidebarFilters";
import { CategoryFiltersWithCenteredTextAndDropdownProductFilters } from "~/components/CategoryFiltersWithCenteredTextAndDropdownProductFilters";
import { CategoryFiltersWithDropdownProductFilters } from "~/components/CategoryFiltersWithDropdownProductFilters";
import { CategoryFiltersWithExpandableProductFilterPanel } from "~/components/CategoryFiltersWithExpandableProductFilterPanel";
import { CategoryFiltersWithInlineActionsAndExpandableSidebarFilters } from "~/components/CategoryFiltersWithInlineActionsAndExpandableSidebarFilters";
const meta: Meta = {
  title: "Ecommerce/Components/Category Filters",
};
export default meta;
export const SidebarFilters: StoryObj = {
  render: () => <CategoryFiltersSidebarFilters />,
};
export const WithCenteredTextAndDropdownProductFilters: StoryObj = {
  render: () => <CategoryFiltersWithCenteredTextAndDropdownProductFilters />,
};
export const WithDropdownProductFilters: StoryObj = {
  render: () => <CategoryFiltersWithDropdownProductFilters />,
};
export const WithExpandableProductFilterPanel: StoryObj = {
  render: () => <CategoryFiltersWithExpandableProductFilterPanel />,
};
export const WithInlineActionsAndExpandableSidebarFilters: StoryObj = {
  render: () => <CategoryFiltersWithInlineActionsAndExpandableSidebarFilters />,
};
