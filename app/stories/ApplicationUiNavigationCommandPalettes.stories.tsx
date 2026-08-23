import type { Meta, StoryObj } from "@storybook/react";
import { CommandPalettesDarkWithIcons } from "~/components/CommandPalettesDarkWithIcons";
import { CommandPalettesSemiTransparentWithIcons } from "~/components/CommandPalettesSemiTransparentWithIcons";
import { CommandPalettesSimple } from "~/components/CommandPalettesSimple";
import { CommandPalettesSimpleWithPadding } from "~/components/CommandPalettesSimpleWithPadding";
import { CommandPalettesWithFooter } from "~/components/CommandPalettesWithFooter";
import { CommandPalettesWithGroups } from "~/components/CommandPalettesWithGroups";
import { CommandPalettesWithIcons } from "~/components/CommandPalettesWithIcons";
import { CommandPalettesWithImagesAndDescriptions } from "~/components/CommandPalettesWithImagesAndDescriptions";
import { CommandPalettesWithPreview } from "~/components/CommandPalettesWithPreview";
const meta: Meta = {
  title: "Application UI/Navigation/Command Palettes",
};
export default meta;
export const DarkWithIcons: StoryObj = {
  render: () => <CommandPalettesDarkWithIcons />,
};
export const SemiTransparentWithIcons: StoryObj = {
  render: () => <CommandPalettesSemiTransparentWithIcons />,
};
export const Simple: StoryObj = {
  render: () => <CommandPalettesSimple />,
};
export const SimpleWithPadding: StoryObj = {
  render: () => <CommandPalettesSimpleWithPadding />,
};
export const WithFooter: StoryObj = {
  render: () => <CommandPalettesWithFooter />,
};
export const WithGroups: StoryObj = {
  render: () => <CommandPalettesWithGroups />,
};
export const WithIcons: StoryObj = {
  render: () => <CommandPalettesWithIcons />,
};
export const WithImagesAndDescriptions: StoryObj = {
  render: () => <CommandPalettesWithImagesAndDescriptions />,
};
export const WithPreview: StoryObj = {
  render: () => <CommandPalettesWithPreview />,
};
