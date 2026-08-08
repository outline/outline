import type { Meta, StoryObj } from "@storybook/react";
import { SignInFormsSimple } from "~/components/SignInFormsSimple";
import { SignInFormsSimpleCard } from "~/components/SignInFormsSimpleCard";
import { SignInFormsSimpleNoLabels } from "~/components/SignInFormsSimpleNoLabels";
import { SignInFormsSimpleOnDark } from "~/components/SignInFormsSimpleOnDark";
import { SignInFormsSplitScreen } from "~/components/SignInFormsSplitScreen";

const meta: Meta = {
  title: "Application UI/Forms/Sign In Forms",
};

export default meta;

export const Simple: StoryObj = {
  render: () => <SignInFormsSimple />,
};

export const SimpleCard: StoryObj = {
  render: () => <SignInFormsSimpleCard />,
};

export const SimpleNoLabels: StoryObj = {
  render: () => <SignInFormsSimpleNoLabels />,
};

export const SimpleOnDark: StoryObj = {
  render: () => <SignInFormsSimpleOnDark />,
};

export const SplitScreen: StoryObj = {
  render: () => <SignInFormsSplitScreen />,
};
