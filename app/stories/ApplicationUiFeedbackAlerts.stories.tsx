import type { Meta, StoryObj } from "@storybook/react";
import { AlertsWithAccentBorder } from "~/components/AlertsWithAccentBorder";
import { AlertsWithActions } from "~/components/AlertsWithActions";
import { AlertsWithDescription } from "~/components/AlertsWithDescription";
import { AlertsWithDismissButton } from "~/components/AlertsWithDismissButton";
import { AlertsWithLinkOnRight } from "~/components/AlertsWithLinkOnRight";
import { AlertsWithList } from "~/components/AlertsWithList";
const meta: Meta = {
  title: "Application UI/Feedback/Alerts",
};
export default meta;
export const WithAccentBorder: StoryObj = {
  render: () => <AlertsWithAccentBorder />,
};
export const WithActions: StoryObj = {
  render: () => <AlertsWithActions />,
};
export const WithDescription: StoryObj = {
  render: () => <AlertsWithDescription />,
};
export const WithDismissButton: StoryObj = {
  render: () => <AlertsWithDismissButton />,
};
export const WithLinkOnRight: StoryObj = {
  render: () => <AlertsWithLinkOnRight />,
};
export const WithList: StoryObj = {
  render: () => <AlertsWithList />,
};
