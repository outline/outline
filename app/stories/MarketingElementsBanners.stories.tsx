import type { Meta, StoryObj } from "@storybook/react";
import { BannersBottomAligned } from "~/components/BannersBottomAligned";
import { BannersFloatingAtBottom } from "~/components/BannersFloatingAtBottom";
import { BannersFloatingAtBottomCentered } from "~/components/BannersFloatingAtBottomCentered";
import { BannersLeftAligned } from "~/components/BannersLeftAligned";
import { BannersOnBrand } from "~/components/BannersOnBrand";
import { BannersOnDark } from "~/components/BannersOnDark";
import { BannersPrivacyNoticeCentered } from "~/components/BannersPrivacyNoticeCentered";
import { BannersPrivacyNoticeFullWidth } from "~/components/BannersPrivacyNoticeFullWidth";
import { BannersPrivacyNoticeLeftAligned } from "~/components/BannersPrivacyNoticeLeftAligned";
import { BannersPrivacyNoticeRightAligned } from "~/components/BannersPrivacyNoticeRightAligned";
import { BannersWithBackgroundGlow } from "~/components/BannersWithBackgroundGlow";
import { BannersWithButton } from "~/components/BannersWithButton";
import { BannersWithLink } from "~/components/BannersWithLink";

const meta: Meta = {
  title: "Marketing/Elements/Banners",
};

export default meta;

export const BottomAligned: StoryObj = {
  render: () => <BannersBottomAligned />,
};

export const FloatingAtBottom: StoryObj = {
  render: () => <BannersFloatingAtBottom />,
};

export const FloatingAtBottomCentered: StoryObj = {
  render: () => <BannersFloatingAtBottomCentered />,
};

export const LeftAligned: StoryObj = {
  render: () => <BannersLeftAligned />,
};

export const OnBrand: StoryObj = {
  render: () => <BannersOnBrand />,
};

export const OnDark: StoryObj = {
  render: () => <BannersOnDark />,
};

export const PrivacyNoticeCentered: StoryObj = {
  render: () => <BannersPrivacyNoticeCentered />,
};

export const PrivacyNoticeFullWidth: StoryObj = {
  render: () => <BannersPrivacyNoticeFullWidth />,
};

export const PrivacyNoticeLeftAligned: StoryObj = {
  render: () => <BannersPrivacyNoticeLeftAligned />,
};

export const PrivacyNoticeRightAligned: StoryObj = {
  render: () => <BannersPrivacyNoticeRightAligned />,
};

export const WithBackgroundGlow: StoryObj = {
  render: () => <BannersWithBackgroundGlow />,
};

export const WithButton: StoryObj = {
  render: () => <BannersWithButton />,
};

export const WithLink: StoryObj = {
  render: () => <BannersWithLink />,
};
