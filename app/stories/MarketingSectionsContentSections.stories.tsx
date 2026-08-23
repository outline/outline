import type { Meta, StoryObj } from "@storybook/react";
import { ContentSectionsCentered } from "~/components/ContentSectionsCentered";
import { ContentSectionsSplitWithImage } from "~/components/ContentSectionsSplitWithImage";
import { ContentSectionsTwoColumnsWithScreenshot } from "~/components/ContentSectionsTwoColumnsWithScreenshot";
import { ContentSectionsWithStickyProductScreenshot } from "~/components/ContentSectionsWithStickyProductScreenshot";
import { ContentSectionsWithTestimonial } from "~/components/ContentSectionsWithTestimonial";
import { ContentSectionsWithTestimonialAndStats } from "~/components/ContentSectionsWithTestimonialAndStats";
const meta: Meta = {
  title: "Marketing/Sections/Content Sections",
};
export default meta;
export const Centered: StoryObj = {
  render: () => <ContentSectionsCentered />,
};
export const SplitWithImage: StoryObj = {
  render: () => <ContentSectionsSplitWithImage />,
};
export const TwoColumnsWithScreenshot: StoryObj = {
  render: () => <ContentSectionsTwoColumnsWithScreenshot />,
};
export const WithStickyProductScreenshot: StoryObj = {
  render: () => <ContentSectionsWithStickyProductScreenshot />,
};
export const WithTestimonial: StoryObj = {
  render: () => <ContentSectionsWithTestimonial />,
};
export const WithTestimonialAndStats: StoryObj = {
  render: () => <ContentSectionsWithTestimonialAndStats />,
};
