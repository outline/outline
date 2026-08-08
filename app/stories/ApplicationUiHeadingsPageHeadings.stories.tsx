import type { Meta, StoryObj } from "@storybook/react";
import { PageHeadingsCardWithAvatarAndStats } from "~/components/PageHeadingsCardWithAvatarAndStats";
import { PageHeadingsWithActions } from "~/components/PageHeadingsWithActions";
import { PageHeadingsWithActionsAndBreadcrumbs } from "~/components/PageHeadingsWithActionsAndBreadcrumbs";
import { PageHeadingsWithActionsAndBreadcrumbsOnDark } from "~/components/PageHeadingsWithActionsAndBreadcrumbsOnDark";
import { PageHeadingsWithActionsOnDark } from "~/components/PageHeadingsWithActionsOnDark";
import { PageHeadingsWithAvatarAndActions } from "~/components/PageHeadingsWithAvatarAndActions";
import { PageHeadingsWithBannerImage } from "~/components/PageHeadingsWithBannerImage";
import { PageHeadingsWithFiltersAndAction } from "~/components/PageHeadingsWithFiltersAndAction";
import { PageHeadingsWithLogoMetaAndActions } from "~/components/PageHeadingsWithLogoMetaAndActions";
import { PageHeadingsWithMetaActionsAndBreadcrumbs } from "~/components/PageHeadingsWithMetaActionsAndBreadcrumbs";
import { PageHeadingsWithMetaActionsAndBreadcrumbsOnDark } from "~/components/PageHeadingsWithMetaActionsAndBreadcrumbsOnDark";
import { PageHeadingsWithMetaAndActions } from "~/components/PageHeadingsWithMetaAndActions";
import { PageHeadingsWithMetaAndActionsOnDark } from "~/components/PageHeadingsWithMetaAndActionsOnDark";

const meta: Meta = {
  title: "Application UI/Headings/Page Headings",
};

export default meta;

export const CardWithAvatarAndStats: StoryObj = {
  render: () => <PageHeadingsCardWithAvatarAndStats />,
};

export const WithActions: StoryObj = {
  render: () => <PageHeadingsWithActions />,
};

export const WithActionsAndBreadcrumbs: StoryObj = {
  render: () => <PageHeadingsWithActionsAndBreadcrumbs />,
};

export const WithActionsAndBreadcrumbsOnDark: StoryObj = {
  render: () => <PageHeadingsWithActionsAndBreadcrumbsOnDark />,
};

export const WithActionsOnDark: StoryObj = {
  render: () => <PageHeadingsWithActionsOnDark />,
};

export const WithAvatarAndActions: StoryObj = {
  render: () => <PageHeadingsWithAvatarAndActions />,
};

export const WithBannerImage: StoryObj = {
  render: () => <PageHeadingsWithBannerImage />,
};

export const WithFiltersAndAction: StoryObj = {
  render: () => <PageHeadingsWithFiltersAndAction />,
};

export const WithLogoMetaAndActions: StoryObj = {
  render: () => <PageHeadingsWithLogoMetaAndActions />,
};

export const WithMetaActionsAndBreadcrumbs: StoryObj = {
  render: () => <PageHeadingsWithMetaActionsAndBreadcrumbs />,
};

export const WithMetaActionsAndBreadcrumbsOnDark: StoryObj = {
  render: () => <PageHeadingsWithMetaActionsAndBreadcrumbsOnDark />,
};

export const WithMetaAndActions: StoryObj = {
  render: () => <PageHeadingsWithMetaAndActions />,
};

export const WithMetaAndActionsOnDark: StoryObj = {
  render: () => <PageHeadingsWithMetaAndActionsOnDark />,
};
