import type { Meta, StoryObj } from "@storybook/react";
import { SlideOversContactListExample } from "~/components/SlideOversContactListExample";
import { SlideOversCreateProjectFormExample } from "~/components/SlideOversCreateProjectFormExample";
import { SlideOversEmpty } from "~/components/SlideOversEmpty";
import { SlideOversFileDetailsExample } from "~/components/SlideOversFileDetailsExample";
import { SlideOversUserProfileExample } from "~/components/SlideOversUserProfileExample";
import { SlideOversWideCreateProjectFormExample } from "~/components/SlideOversWideCreateProjectFormExample";
import { SlideOversWideEmpty } from "~/components/SlideOversWideEmpty";
import { SlideOversWideHorizontalUserProfileExample } from "~/components/SlideOversWideHorizontalUserProfileExample";
import { SlideOversWithBackgroundOverlay } from "~/components/SlideOversWithBackgroundOverlay";
import { SlideOversWithBrandedHeader } from "~/components/SlideOversWithBrandedHeader";
import { SlideOversWithCloseButtonOnOutside } from "~/components/SlideOversWithCloseButtonOnOutside";
import { SlideOversWithStickyFooter } from "~/components/SlideOversWithStickyFooter";
const meta: Meta = {
  title: "Application UI/Overlays/Slide Overs",
};
export default meta;
export const ContactListExample: StoryObj = {
  render: () => <SlideOversContactListExample />,
};
export const CreateProjectFormExample: StoryObj = {
  render: () => <SlideOversCreateProjectFormExample />,
};
export const Empty: StoryObj = {
  render: () => <SlideOversEmpty />,
};
export const FileDetailsExample: StoryObj = {
  render: () => <SlideOversFileDetailsExample />,
};
export const UserProfileExample: StoryObj = {
  render: () => <SlideOversUserProfileExample />,
};
export const WideCreateProjectFormExample: StoryObj = {
  render: () => <SlideOversWideCreateProjectFormExample />,
};
export const WideEmpty: StoryObj = {
  render: () => <SlideOversWideEmpty />,
};
export const WideHorizontalUserProfileExample: StoryObj = {
  render: () => <SlideOversWideHorizontalUserProfileExample />,
};
export const WithBackgroundOverlay: StoryObj = {
  render: () => <SlideOversWithBackgroundOverlay />,
};
export const WithBrandedHeader: StoryObj = {
  render: () => <SlideOversWithBrandedHeader />,
};
export const WithCloseButtonOnOutside: StoryObj = {
  render: () => <SlideOversWithCloseButtonOnOutside />,
};
export const WithStickyFooter: StoryObj = {
  render: () => <SlideOversWithStickyFooter />,
};
