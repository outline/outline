import type { Meta, StoryObj } from "@storybook/react";
import { CategoryPagesWithImageHeaderAndDetailProductGrid } from "~/components/CategoryPagesWithImageHeaderAndDetailProductGrid";
import { CategoryPagesWithLargeImagesAndFiltersSidebar } from "~/components/CategoryPagesWithLargeImagesAndFiltersSidebar";
import { CategoryPagesWithProductGridAndPagination } from "~/components/CategoryPagesWithProductGridAndPagination";
import { CategoryPagesWithTextHeaderAndImageProductGrid } from "~/components/CategoryPagesWithTextHeaderAndImageProductGrid";
import { CategoryPagesWithTextHeaderAndSimpleProductGrid } from "~/components/CategoryPagesWithTextHeaderAndSimpleProductGrid";

const meta: Meta = {
  title: "Ecommerce/Page Examples/Category Pages",
};

export default meta;

export const WithImageHeaderAndDetailProductGrid: StoryObj = {
  render: () => <CategoryPagesWithImageHeaderAndDetailProductGrid />,
};

export const WithLargeImagesAndFiltersSidebar: StoryObj = {
  render: () => <CategoryPagesWithLargeImagesAndFiltersSidebar />,
};

export const WithProductGridAndPagination: StoryObj = {
  render: () => <CategoryPagesWithProductGridAndPagination />,
};

export const WithTextHeaderAndImageProductGrid: StoryObj = {
  render: () => <CategoryPagesWithTextHeaderAndImageProductGrid />,
};

export const WithTextHeaderAndSimpleProductGrid: StoryObj = {
  render: () => <CategoryPagesWithTextHeaderAndSimpleProductGrid />,
};
