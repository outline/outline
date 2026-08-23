import type { Meta, StoryObj } from "@storybook/react";
import { HeaderCentered } from "~/components/HeaderCentered";
import { HeaderCenteredOnDark } from "~/components/HeaderCenteredOnDark";
import { HeaderCenteredWithBackgroundImage } from "~/components/HeaderCenteredWithBackgroundImage";
import { HeaderCenteredWithEyebrow } from "~/components/HeaderCenteredWithEyebrow";
import { HeaderSimple } from "~/components/HeaderSimple";
import { HeaderSimpleOnDark } from "~/components/HeaderSimpleOnDark";
import { HeaderSimpleWithBackgroundImage } from "~/components/HeaderSimpleWithBackgroundImage";
import { HeaderSimpleWithEyebrow } from "~/components/HeaderSimpleWithEyebrow";
import { HeaderWithCards } from "~/components/HeaderWithCards";
import { HeaderWithStats } from "~/components/HeaderWithStats";
const meta: Meta = {
  title: "Marketing/Sections/Header",
};
export default meta;
export const Centered: StoryObj = {
  render: () => <HeaderCentered />,
};
export const CenteredOnDark: StoryObj = {
  render: () => <HeaderCenteredOnDark />,
};
export const CenteredWithBackgroundImage: StoryObj = {
  render: () => <HeaderCenteredWithBackgroundImage />,
};
export const CenteredWithEyebrow: StoryObj = {
  render: () => <HeaderCenteredWithEyebrow />,
};
export const Simple: StoryObj = {
  render: () => <HeaderSimple />,
};
export const SimpleOnDark: StoryObj = {
  render: () => <HeaderSimpleOnDark />,
};
export const SimpleWithBackgroundImage: StoryObj = {
  render: () => <HeaderSimpleWithBackgroundImage />,
};
export const SimpleWithEyebrow: StoryObj = {
  render: () => <HeaderSimpleWithEyebrow />,
};
export const WithCards: StoryObj = {
  render: () => <HeaderWithCards />,
};
export const WithStats: StoryObj = {
  render: () => <HeaderWithStats />,
};
