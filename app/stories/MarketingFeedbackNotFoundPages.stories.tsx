import type { Meta, StoryObj } from "@storybook/react";
import { NotFoundPagesSimple } from "~/components/NotFoundPagesSimple";
import { NotFoundPagesSplitWithImage } from "~/components/NotFoundPagesSplitWithImage";
import { NotFoundPagesWithBackgroundImage } from "~/components/NotFoundPagesWithBackgroundImage";
import { NotFoundPagesWithNavbarAndFooter } from "~/components/NotFoundPagesWithNavbarAndFooter";
import { NotFoundPagesWithPopularPages } from "~/components/NotFoundPagesWithPopularPages";

const meta: Meta = {
  title: "Marketing/Feedback/404 Pages",
};

export default meta;

export const Simple: StoryObj = {
  render: () => <NotFoundPagesSimple />,
};

export const SplitWithImage: StoryObj = {
  render: () => <NotFoundPagesSplitWithImage />,
};

export const WithBackgroundImage: StoryObj = {
  render: () => <NotFoundPagesWithBackgroundImage />,
};

export const WithNavbarAndFooter: StoryObj = {
  render: () => <NotFoundPagesWithNavbarAndFooter />,
};

export const WithPopularPages: StoryObj = {
  render: () => <NotFoundPagesWithPopularPages />,
};
