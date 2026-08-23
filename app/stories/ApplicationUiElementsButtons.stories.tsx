import type { Meta, StoryObj } from "@storybook/react";
import { ButtonsButtonsWithLeadingIcon } from "~/components/ButtonsButtonsWithLeadingIcon";
import { ButtonsButtonsWithTrailingIcon } from "~/components/ButtonsButtonsWithTrailingIcon";
import { ButtonsCircularButtons } from "~/components/ButtonsCircularButtons";
import { ButtonsPrimaryButtons } from "~/components/ButtonsPrimaryButtons";
import { ButtonsPrimaryButtonsOnDark } from "~/components/ButtonsPrimaryButtonsOnDark";
import { ButtonsRoundedPrimaryButtons } from "~/components/ButtonsRoundedPrimaryButtons";
import { ButtonsRoundedSecondaryButtons } from "~/components/ButtonsRoundedSecondaryButtons";
import { ButtonsSecondaryButtons } from "~/components/ButtonsSecondaryButtons";
import { ButtonsSecondaryButtonsOnDark } from "~/components/ButtonsSecondaryButtonsOnDark";
import { ButtonsSoftButtons } from "~/components/ButtonsSoftButtons";
const meta: Meta = {
  title: "Application UI/Elements/Buttons",
};
export default meta;
export const ButtonsWithLeadingIcon: StoryObj = {
  render: () => <ButtonsButtonsWithLeadingIcon />,
};
export const ButtonsWithTrailingIcon: StoryObj = {
  render: () => <ButtonsButtonsWithTrailingIcon />,
};
export const CircularButtons: StoryObj = {
  render: () => <ButtonsCircularButtons />,
};
export const PrimaryButtons: StoryObj = {
  render: () => <ButtonsPrimaryButtons />,
};
export const PrimaryButtonsOnDark: StoryObj = {
  render: () => <ButtonsPrimaryButtonsOnDark />,
};
export const RoundedPrimaryButtons: StoryObj = {
  render: () => <ButtonsRoundedPrimaryButtons />,
};
export const RoundedSecondaryButtons: StoryObj = {
  render: () => <ButtonsRoundedSecondaryButtons />,
};
export const SecondaryButtons: StoryObj = {
  render: () => <ButtonsSecondaryButtons />,
};
export const SecondaryButtonsOnDark: StoryObj = {
  render: () => <ButtonsSecondaryButtonsOnDark />,
};
export const SoftButtons: StoryObj = {
  render: () => <ButtonsSoftButtons />,
};
