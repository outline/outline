import type { Meta, StoryObj } from "@storybook/react";
import { GridListsActionsWithSharedBorders } from "~/components/GridListsActionsWithSharedBorders";
import { GridListsContactCards } from "~/components/GridListsContactCards";
import { GridListsContactCardsWithSmallPortraits } from "~/components/GridListsContactCardsWithSmallPortraits";
import { GridListsHorizontalLinkCards } from "~/components/GridListsHorizontalLinkCards";
import { GridListsImagesWithDetails } from "~/components/GridListsImagesWithDetails";
import { GridListsLogosCardsWithDescriptionList } from "~/components/GridListsLogosCardsWithDescriptionList";
import { GridListsSimpleCards } from "~/components/GridListsSimpleCards";
const meta: Meta = {
  title: "Application UI/Lists/Grid Lists",
};
export default meta;
export const ActionsWithSharedBorders: StoryObj = {
  render: () => <GridListsActionsWithSharedBorders />,
};
export const ContactCards: StoryObj = {
  render: () => <GridListsContactCards />,
};
export const ContactCardsWithSmallPortraits: StoryObj = {
  render: () => <GridListsContactCardsWithSmallPortraits />,
};
export const HorizontalLinkCards: StoryObj = {
  render: () => <GridListsHorizontalLinkCards />,
};
export const ImagesWithDetails: StoryObj = {
  render: () => <GridListsImagesWithDetails />,
};
export const LogosCardsWithDescriptionList: StoryObj = {
  render: () => <GridListsLogosCardsWithDescriptionList />,
};
export const SimpleCards: StoryObj = {
  render: () => <GridListsSimpleCards />,
};
