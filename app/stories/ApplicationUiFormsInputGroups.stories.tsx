import type { Meta, StoryObj } from "@storybook/react";
import { InputGroupsInputWithAddOn } from "~/components/InputGroupsInputWithAddOn";
import { InputGroupsInputWithCornerHint } from "~/components/InputGroupsInputWithCornerHint";
import { InputGroupsInputWithDisabledState } from "~/components/InputGroupsInputWithDisabledState";
import { InputGroupsInputWithGrayBackgroundAndBottomBorder } from "~/components/InputGroupsInputWithGrayBackgroundAndBottomBorder";
import { InputGroupsInputWithHiddenLabel } from "~/components/InputGroupsInputWithHiddenLabel";
import { InputGroupsInputWithInlineAddOn } from "~/components/InputGroupsInputWithInlineAddOn";
import { InputGroupsInputWithInlineLeadingAddOnAndTrailingDropdown } from "~/components/InputGroupsInputWithInlineLeadingAddOnAndTrailingDropdown";
import { InputGroupsInputWithInlineLeadingAndTrailingAddOns } from "~/components/InputGroupsInputWithInlineLeadingAndTrailingAddOns";
import { InputGroupsInputWithInlineLeadingDropdown } from "~/components/InputGroupsInputWithInlineLeadingDropdown";
import { InputGroupsInputWithInsetLabel } from "~/components/InputGroupsInputWithInsetLabel";
import { InputGroupsInputWithKeyboardShortcut } from "~/components/InputGroupsInputWithKeyboardShortcut";
import { InputGroupsInputWithLabel } from "~/components/InputGroupsInputWithLabel";
import { InputGroupsInputWithLabelAndHelpText } from "~/components/InputGroupsInputWithLabelAndHelpText";
import { InputGroupsInputWithLeadingIcon } from "~/components/InputGroupsInputWithLeadingIcon";
import { InputGroupsInputWithLeadingIconAndTrailingButton } from "~/components/InputGroupsInputWithLeadingIconAndTrailingButton";
import { InputGroupsInputWithOverlappingLabel } from "~/components/InputGroupsInputWithOverlappingLabel";
import { InputGroupsInputWithPillShape } from "~/components/InputGroupsInputWithPillShape";
import { InputGroupsInputWithTrailingIcon } from "~/components/InputGroupsInputWithTrailingIcon";
import { InputGroupsInputWithValidationError } from "~/components/InputGroupsInputWithValidationError";
import { InputGroupsInputsWithInsetLabelsAndSharedBorders } from "~/components/InputGroupsInputsWithInsetLabelsAndSharedBorders";
import { InputGroupsInputsWithSharedBorders } from "~/components/InputGroupsInputsWithSharedBorders";

const meta: Meta = {
  title: "Application UI/Forms/Input Groups",
};

export default meta;

export const InputWithAddOn: StoryObj = {
  render: () => <InputGroupsInputWithAddOn />,
};

export const InputWithCornerHint: StoryObj = {
  render: () => <InputGroupsInputWithCornerHint />,
};

export const InputWithDisabledState: StoryObj = {
  render: () => <InputGroupsInputWithDisabledState />,
};

export const InputWithGrayBackgroundAndBottomBorder: StoryObj = {
  render: () => <InputGroupsInputWithGrayBackgroundAndBottomBorder />,
};

export const InputWithHiddenLabel: StoryObj = {
  render: () => <InputGroupsInputWithHiddenLabel />,
};

export const InputWithInlineAddOn: StoryObj = {
  render: () => <InputGroupsInputWithInlineAddOn />,
};

export const InputWithInlineLeadingAddOnAndTrailingDropdown: StoryObj = {
  render: () => <InputGroupsInputWithInlineLeadingAddOnAndTrailingDropdown />,
};

export const InputWithInlineLeadingAndTrailingAddOns: StoryObj = {
  render: () => <InputGroupsInputWithInlineLeadingAndTrailingAddOns />,
};

export const InputWithInlineLeadingDropdown: StoryObj = {
  render: () => <InputGroupsInputWithInlineLeadingDropdown />,
};

export const InputWithInsetLabel: StoryObj = {
  render: () => <InputGroupsInputWithInsetLabel />,
};

export const InputWithKeyboardShortcut: StoryObj = {
  render: () => <InputGroupsInputWithKeyboardShortcut />,
};

export const InputWithLabel: StoryObj = {
  render: () => <InputGroupsInputWithLabel />,
};

export const InputWithLabelAndHelpText: StoryObj = {
  render: () => <InputGroupsInputWithLabelAndHelpText />,
};

export const InputWithLeadingIcon: StoryObj = {
  render: () => <InputGroupsInputWithLeadingIcon />,
};

export const InputWithLeadingIconAndTrailingButton: StoryObj = {
  render: () => <InputGroupsInputWithLeadingIconAndTrailingButton />,
};

export const InputWithOverlappingLabel: StoryObj = {
  render: () => <InputGroupsInputWithOverlappingLabel />,
};

export const InputWithPillShape: StoryObj = {
  render: () => <InputGroupsInputWithPillShape />,
};

export const InputWithTrailingIcon: StoryObj = {
  render: () => <InputGroupsInputWithTrailingIcon />,
};

export const InputWithValidationError: StoryObj = {
  render: () => <InputGroupsInputWithValidationError />,
};

export const InputsWithInsetLabelsAndSharedBorders: StoryObj = {
  render: () => <InputGroupsInputsWithInsetLabelsAndSharedBorders />,
};

export const InputsWithSharedBorders: StoryObj = {
  render: () => <InputGroupsInputsWithSharedBorders />,
};
