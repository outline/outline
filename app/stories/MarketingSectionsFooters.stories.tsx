import type { Meta, StoryObj } from "@storybook/react";
import { Footers4ColumnSimple as Footers4ColumnSimpleView } from "~/components/Footers4ColumnSimple";
import { Footers4ColumnSimpleDark as Footers4ColumnSimpleDarkView } from "~/components/Footers4ColumnSimpleDark";
import { Footers4ColumnWithCompanyMission as Footers4ColumnWithCompanyMissionView } from "~/components/Footers4ColumnWithCompanyMission";
import { Footers4ColumnWithCompanyMissionOnDark as Footers4ColumnWithCompanyMissionOnDarkView } from "~/components/Footers4ColumnWithCompanyMissionOnDark";
import { Footers4ColumnWithNewsletter as Footers4ColumnWithNewsletterView } from "~/components/Footers4ColumnWithNewsletter";
import { Footers4ColumnWithNewsletterBelow as Footers4ColumnWithNewsletterBelowView } from "~/components/Footers4ColumnWithNewsletterBelow";
import { Footers4ColumnWithNewsletterBelowDark as Footers4ColumnWithNewsletterBelowDarkView } from "~/components/Footers4ColumnWithNewsletterBelowDark";
import { Footers4ColumnWithNewsletterDark as Footers4ColumnWithNewsletterDarkView } from "~/components/Footers4ColumnWithNewsletterDark";
import { FootersSimpleCentered } from "~/components/FootersSimpleCentered";
import { FootersSocialLinksOnly } from "~/components/FootersSocialLinksOnly";

const meta: Meta = {
  title: "Marketing/Sections/Footers",
};

export default meta;

export const Footers4ColumnSimple: StoryObj = {
  render: () => <Footers4ColumnSimpleView />,
};

export const Footers4ColumnSimpleDark: StoryObj = {
  render: () => <Footers4ColumnSimpleDarkView />,
};

export const Footers4ColumnWithCompanyMission: StoryObj = {
  render: () => <Footers4ColumnWithCompanyMissionView />,
};

export const Footers4ColumnWithCompanyMissionOnDark: StoryObj = {
  render: () => <Footers4ColumnWithCompanyMissionOnDarkView />,
};

export const Footers4ColumnWithNewsletter: StoryObj = {
  render: () => <Footers4ColumnWithNewsletterView />,
};

export const Footers4ColumnWithNewsletterBelow: StoryObj = {
  render: () => <Footers4ColumnWithNewsletterBelowView />,
};

export const Footers4ColumnWithNewsletterBelowDark: StoryObj = {
  render: () => <Footers4ColumnWithNewsletterBelowDarkView />,
};

export const Footers4ColumnWithNewsletterDark: StoryObj = {
  render: () => <Footers4ColumnWithNewsletterDarkView />,
};

export const SimpleCentered: StoryObj = {
  render: () => <FootersSimpleCentered />,
};

export const SocialLinksOnly: StoryObj = {
  render: () => <FootersSocialLinksOnly />,
};
