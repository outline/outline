import type { Meta, StoryObj } from "@storybook/react";
import { StepsBullets } from "~/components/StepsBullets";
import { StepsBulletsAndText } from "~/components/StepsBulletsAndText";
import { StepsCircles } from "~/components/StepsCircles";
import { StepsCirclesWithText } from "~/components/StepsCirclesWithText";
import { StepsPanels } from "~/components/StepsPanels";
import { StepsPanelsWithBorder } from "~/components/StepsPanelsWithBorder";
import { StepsProgressBar } from "~/components/StepsProgressBar";
import { StepsSimple } from "~/components/StepsSimple";
const meta: Meta = {
  title: "Application UI/Navigation/Steps",
};
export default meta;
export const Bullets: StoryObj = {
  render: () => <StepsBullets />,
};
export const BulletsAndText: StoryObj = {
  render: () => <StepsBulletsAndText />,
};
export const Circles: StoryObj = {
  render: () => <StepsCircles />,
};
export const CirclesWithText: StoryObj = {
  render: () => <StepsCirclesWithText />,
};
export const Panels: StoryObj = {
  render: () => <StepsPanels />,
};
export const PanelsWithBorder: StoryObj = {
  render: () => <StepsPanelsWithBorder />,
};
export const ProgressBar: StoryObj = {
  render: () => <StepsProgressBar />,
};
export const Simple: StoryObj = {
  render: () => <StepsSimple />,
};
