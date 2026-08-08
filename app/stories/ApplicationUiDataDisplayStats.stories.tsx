import type { Meta, StoryObj } from "@storybook/react";
import { StatsSimpleInCards } from "~/components/StatsSimpleInCards";
import { StatsSimpleOnDark } from "~/components/StatsSimpleOnDark";
import { StatsWithBrandIcon } from "~/components/StatsWithBrandIcon";
import { StatsWithSharedBorders } from "~/components/StatsWithSharedBorders";
import { StatsWithTrending } from "~/components/StatsWithTrending";

const meta: Meta = {
  title: "Application UI/Data Display/Stats",
};

export default meta;

export const SimpleInCards: StoryObj = {
  render: () => <StatsSimpleInCards />,
};

export const SimpleOnDark: StoryObj = {
  render: () => <StatsSimpleOnDark />,
};

export const WithBrandIcon: StoryObj = {
  render: () => <StatsWithBrandIcon />,
};

export const WithSharedBorders: StoryObj = {
  render: () => <StatsWithSharedBorders />,
};

export const WithTrending: StoryObj = {
  render: () => <StatsWithTrending />,
};
