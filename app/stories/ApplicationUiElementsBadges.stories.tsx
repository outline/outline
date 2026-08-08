import type { Meta, StoryObj } from "@storybook/react";
import { BadgesFlat } from "~/components/BadgesFlat";
import { BadgesFlatPill } from "~/components/BadgesFlatPill";
import { BadgesFlatPillWithDot } from "~/components/BadgesFlatPillWithDot";
import { BadgesFlatWithDot } from "~/components/BadgesFlatWithDot";
import { BadgesFlatWithRemoveButton } from "~/components/BadgesFlatWithRemoveButton";
import { BadgesPillWithBorder } from "~/components/BadgesPillWithBorder";
import { BadgesPillWithBorderAndDot } from "~/components/BadgesPillWithBorderAndDot";
import { BadgesSmallFlat } from "~/components/BadgesSmallFlat";
import { BadgesSmallFlatPill } from "~/components/BadgesSmallFlatPill";
import { BadgesSmallFlatPillWithDot } from "~/components/BadgesSmallFlatPillWithDot";
import { BadgesSmallFlatWithDot } from "~/components/BadgesSmallFlatWithDot";
import { BadgesSmallPillWithBorder } from "~/components/BadgesSmallPillWithBorder";
import { BadgesSmallWithBorder } from "~/components/BadgesSmallWithBorder";
import { BadgesWithBorder } from "~/components/BadgesWithBorder";
import { BadgesWithBorderAndDot } from "~/components/BadgesWithBorderAndDot";
import { BadgesWithBorderAndDotOnDark } from "~/components/BadgesWithBorderAndDotOnDark";
import { BadgesWithBorderAndRemoveButton } from "~/components/BadgesWithBorderAndRemoveButton";
import { BadgesWithBorderOnDark } from "~/components/BadgesWithBorderOnDark";

const meta: Meta = {
  title: "Application UI/Elements/Badges",
};

export default meta;

export const Flat: StoryObj = {
  render: () => <BadgesFlat />,
};

export const FlatPill: StoryObj = {
  render: () => <BadgesFlatPill />,
};

export const FlatPillWithDot: StoryObj = {
  render: () => <BadgesFlatPillWithDot />,
};

export const FlatWithDot: StoryObj = {
  render: () => <BadgesFlatWithDot />,
};

export const FlatWithRemoveButton: StoryObj = {
  render: () => <BadgesFlatWithRemoveButton />,
};

export const PillWithBorder: StoryObj = {
  render: () => <BadgesPillWithBorder />,
};

export const PillWithBorderAndDot: StoryObj = {
  render: () => <BadgesPillWithBorderAndDot />,
};

export const SmallFlat: StoryObj = {
  render: () => <BadgesSmallFlat />,
};

export const SmallFlatPill: StoryObj = {
  render: () => <BadgesSmallFlatPill />,
};

export const SmallFlatPillWithDot: StoryObj = {
  render: () => <BadgesSmallFlatPillWithDot />,
};

export const SmallFlatWithDot: StoryObj = {
  render: () => <BadgesSmallFlatWithDot />,
};

export const SmallPillWithBorder: StoryObj = {
  render: () => <BadgesSmallPillWithBorder />,
};

export const SmallWithBorder: StoryObj = {
  render: () => <BadgesSmallWithBorder />,
};

export const WithBorder: StoryObj = {
  render: () => <BadgesWithBorder />,
};

export const WithBorderAndDot: StoryObj = {
  render: () => <BadgesWithBorderAndDot />,
};

export const WithBorderAndDotOnDark: StoryObj = {
  render: () => <BadgesWithBorderAndDotOnDark />,
};

export const WithBorderAndRemoveButton: StoryObj = {
  render: () => <BadgesWithBorderAndRemoveButton />,
};

export const WithBorderOnDark: StoryObj = {
  render: () => <BadgesWithBorderOnDark />,
};
