import type { Meta, StoryObj } from "@storybook/react";
import { TeamSectionsDarkVersionWithLargeImages } from "~/components/TeamSectionsDarkVersionWithLargeImages";
import { TeamSectionsFullWidthWithVerticalImages } from "~/components/TeamSectionsFullWidthWithVerticalImages";
import { TeamSectionsGridWithLargeRoundImages } from "~/components/TeamSectionsGridWithLargeRoundImages";
import { TeamSectionsGridWithRoundImages } from "~/components/TeamSectionsGridWithRoundImages";
import { TeamSectionsWithImageAndShortParagraph } from "~/components/TeamSectionsWithImageAndShortParagraph";
import { TeamSectionsWithLargeImages } from "~/components/TeamSectionsWithLargeImages";
import { TeamSectionsWithMediumImagesOnDark } from "~/components/TeamSectionsWithMediumImagesOnDark";
import { TeamSectionsWithSmallImages } from "~/components/TeamSectionsWithSmallImages";
import { TeamSectionsWithVerticalImages } from "~/components/TeamSectionsWithVerticalImages";

const meta: Meta = {
  title: "Marketing/Sections/Team Sections",
};

export default meta;

export const DarkVersionWithLargeImages: StoryObj = {
  render: () => <TeamSectionsDarkVersionWithLargeImages />,
};

export const FullWidthWithVerticalImages: StoryObj = {
  render: () => <TeamSectionsFullWidthWithVerticalImages />,
};

export const GridWithLargeRoundImages: StoryObj = {
  render: () => <TeamSectionsGridWithLargeRoundImages />,
};

export const GridWithRoundImages: StoryObj = {
  render: () => <TeamSectionsGridWithRoundImages />,
};

export const WithImageAndShortParagraph: StoryObj = {
  render: () => <TeamSectionsWithImageAndShortParagraph />,
};

export const WithLargeImages: StoryObj = {
  render: () => <TeamSectionsWithLargeImages />,
};

export const WithMediumImagesOnDark: StoryObj = {
  render: () => <TeamSectionsWithMediumImagesOnDark />,
};

export const WithSmallImages: StoryObj = {
  render: () => <TeamSectionsWithSmallImages />,
};

export const WithVerticalImages: StoryObj = {
  render: () => <TeamSectionsWithVerticalImages />,
};
