import type { Meta, StoryObj } from "@storybook/react";
import { BreadcrumbsContained } from "~/components/BreadcrumbsContained";
import { BreadcrumbsFullWidthBar } from "~/components/BreadcrumbsFullWidthBar";
import { BreadcrumbsSimpleWithChevrons } from "~/components/BreadcrumbsSimpleWithChevrons";
import { BreadcrumbsSimpleWithSlashes } from "~/components/BreadcrumbsSimpleWithSlashes";

const meta: Meta = {
  title: "Application UI/Navigation/Breadcrumbs",
};

export default meta;

export const Contained: StoryObj = {
  render: () => <BreadcrumbsContained />,
};

export const FullWidthBar: StoryObj = {
  render: () => <BreadcrumbsFullWidthBar />,
};

export const SimpleWithChevrons: StoryObj = {
  render: () => <BreadcrumbsSimpleWithChevrons />,
};

export const SimpleWithSlashes: StoryObj = {
  render: () => <BreadcrumbsSimpleWithSlashes />,
};
