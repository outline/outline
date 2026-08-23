import type { Meta, StoryObj } from "@storybook/react";
import { HeroesSimpleCentered } from "~/components/HeroesSimpleCentered";
import { HeroesSimpleCenteredWithBackgroundImage } from "~/components/HeroesSimpleCenteredWithBackgroundImage";
import { HeroesSplitWithCodeExample } from "~/components/HeroesSplitWithCodeExample";
import { HeroesSplitWithImage } from "~/components/HeroesSplitWithImage";
import { HeroesSplitWithScreenshot } from "~/components/HeroesSplitWithScreenshot";
import { HeroesSplitWithScreenshotOnDark } from "~/components/HeroesSplitWithScreenshotOnDark";
import { HeroesWithAngledImageOnRight } from "~/components/HeroesWithAngledImageOnRight";
import { HeroesWithAppScreenshot } from "~/components/HeroesWithAppScreenshot";
import { HeroesWithAppScreenshotOnDark } from "~/components/HeroesWithAppScreenshotOnDark";
import { HeroesWithImageTiles } from "~/components/HeroesWithImageTiles";
import { HeroesWithOffsetImage } from "~/components/HeroesWithOffsetImage";
import { HeroesWithPhoneMockup } from "~/components/HeroesWithPhoneMockup";
const meta: Meta = {
  title: "Marketing/Sections/Heroes",
};
export default meta;
export const SimpleCentered: StoryObj = {
  render: () => <HeroesSimpleCentered />,
};
export const SimpleCenteredWithBackgroundImage: StoryObj = {
  render: () => <HeroesSimpleCenteredWithBackgroundImage />,
};
export const SplitWithCodeExample: StoryObj = {
  render: () => <HeroesSplitWithCodeExample />,
};
export const SplitWithImage: StoryObj = {
  render: () => <HeroesSplitWithImage />,
};
export const SplitWithScreenshot: StoryObj = {
  render: () => <HeroesSplitWithScreenshot />,
};
export const SplitWithScreenshotOnDark: StoryObj = {
  render: () => <HeroesSplitWithScreenshotOnDark />,
};
export const WithAngledImageOnRight: StoryObj = {
  render: () => <HeroesWithAngledImageOnRight />,
};
export const WithAppScreenshot: StoryObj = {
  render: () => <HeroesWithAppScreenshot />,
};
export const WithAppScreenshotOnDark: StoryObj = {
  render: () => <HeroesWithAppScreenshotOnDark />,
};
export const WithImageTiles: StoryObj = {
  render: () => <HeroesWithImageTiles />,
};
export const WithOffsetImage: StoryObj = {
  render: () => <HeroesWithOffsetImage />,
};
export const WithPhoneMockup: StoryObj = {
  render: () => <HeroesWithPhoneMockup />,
};
