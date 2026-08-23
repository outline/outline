import type { Meta, StoryObj } from "@storybook/react";
import { ListContainersCardWithDividers } from "~/components/ListContainersCardWithDividers";
import { ListContainersCardWithDividersFullWidthOnMobile } from "~/components/ListContainersCardWithDividersFullWidthOnMobile";
import { ListContainersFlatCardWithDividers } from "~/components/ListContainersFlatCardWithDividers";
import { ListContainersSeparateCards } from "~/components/ListContainersSeparateCards";
import { ListContainersSeparateCardsFullWidthOnMobile } from "~/components/ListContainersSeparateCardsFullWidthOnMobile";
import { ListContainersSimpleWithDividers } from "~/components/ListContainersSimpleWithDividers";
import { ListContainersSimpleWithDividersFullWidthOnMobile } from "~/components/ListContainersSimpleWithDividersFullWidthOnMobile";
const meta: Meta = {
  title: "Application UI/Layout/List Containers",
};
export default meta;
export const CardWithDividers: StoryObj = {
  render: () => <ListContainersCardWithDividers />,
};
export const CardWithDividersFullWidthOnMobile: StoryObj = {
  render: () => <ListContainersCardWithDividersFullWidthOnMobile />,
};
export const FlatCardWithDividers: StoryObj = {
  render: () => <ListContainersFlatCardWithDividers />,
};
export const SeparateCards: StoryObj = {
  render: () => <ListContainersSeparateCards />,
};
export const SeparateCardsFullWidthOnMobile: StoryObj = {
  render: () => <ListContainersSeparateCardsFullWidthOnMobile />,
};
export const SimpleWithDividers: StoryObj = {
  render: () => <ListContainersSimpleWithDividers />,
};
export const SimpleWithDividersFullWidthOnMobile: StoryObj = {
  render: () => <ListContainersSimpleWithDividersFullWidthOnMobile />,
};
