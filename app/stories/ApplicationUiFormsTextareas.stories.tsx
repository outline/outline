import type { Meta, StoryObj } from "@storybook/react";
import { TextareasSimple } from "~/components/TextareasSimple";
import { TextareasWithAvatarAndActions } from "~/components/TextareasWithAvatarAndActions";
import { TextareasWithPreviewButton } from "~/components/TextareasWithPreviewButton";
import { TextareasWithTitleAndPillActions } from "~/components/TextareasWithTitleAndPillActions";
import { TextareasWithUnderlineAndActions } from "~/components/TextareasWithUnderlineAndActions";

const meta: Meta = {
  title: "Application UI/Forms/Textareas",
};

export default meta;

export const Simple: StoryObj = {
  render: () => <TextareasSimple />,
};

export const WithAvatarAndActions: StoryObj = {
  render: () => <TextareasWithAvatarAndActions />,
};

export const WithPreviewButton: StoryObj = {
  render: () => <TextareasWithPreviewButton />,
};

export const WithTitleAndPillActions: StoryObj = {
  render: () => <TextareasWithTitleAndPillActions />,
};

export const WithUnderlineAndActions: StoryObj = {
  render: () => <TextareasWithUnderlineAndActions />,
};
