import type { Meta, StoryObj } from "@storybook/react";
import { ModalsCenteredWithSingleAction } from "~/components/ModalsCenteredWithSingleAction";
import { ModalsCenteredWithWideButtons } from "~/components/ModalsCenteredWithWideButtons";
import { ModalsSimpleAlert } from "~/components/ModalsSimpleAlert";
import { ModalsSimpleAlertWithLeftAlignedButtons } from "~/components/ModalsSimpleAlertWithLeftAlignedButtons";
import { ModalsSimpleWithDismissButton } from "~/components/ModalsSimpleWithDismissButton";
import { ModalsSimpleWithGrayFooter } from "~/components/ModalsSimpleWithGrayFooter";
const meta: Meta = {
  title: "Application UI/Overlays/Modals",
};
export default meta;
export const CenteredWithSingleAction: StoryObj = {
  render: () => <ModalsCenteredWithSingleAction />,
};
export const CenteredWithWideButtons: StoryObj = {
  render: () => <ModalsCenteredWithWideButtons />,
};
export const SimpleAlert: StoryObj = {
  render: () => <ModalsSimpleAlert />,
};
export const SimpleAlertWithLeftAlignedButtons: StoryObj = {
  render: () => <ModalsSimpleAlertWithLeftAlignedButtons />,
};
export const SimpleWithDismissButton: StoryObj = {
  render: () => <ModalsSimpleWithDismissButton />,
};
export const SimpleWithGrayFooter: StoryObj = {
  render: () => <ModalsSimpleWithGrayFooter />,
};
