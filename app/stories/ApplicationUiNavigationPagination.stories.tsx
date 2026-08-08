import type { Meta, StoryObj } from "@storybook/react";
import { PaginationCardFooterWithPageButtons } from "~/components/PaginationCardFooterWithPageButtons";
import { PaginationCenteredPageNumbers } from "~/components/PaginationCenteredPageNumbers";
import { PaginationSimpleCardFooter } from "~/components/PaginationSimpleCardFooter";

const meta: Meta = {
  title: "Application UI/Navigation/Pagination",
};

export default meta;

export const CardFooterWithPageButtons: StoryObj = {
  render: () => <PaginationCardFooterWithPageButtons />,
};

export const CenteredPageNumbers: StoryObj = {
  render: () => <PaginationCenteredPageNumbers />,
};

export const SimpleCardFooter: StoryObj = {
  render: () => <PaginationSimpleCardFooter />,
};
