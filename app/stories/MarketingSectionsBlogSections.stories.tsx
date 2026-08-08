import type { Meta, StoryObj } from "@storybook/react";
import { BlogSectionsSingleColumn } from "~/components/BlogSectionsSingleColumn";
import { BlogSectionsSingleColumnWithImages } from "~/components/BlogSectionsSingleColumnWithImages";
import { BlogSectionsThreeColumn } from "~/components/BlogSectionsThreeColumn";
import { BlogSectionsThreeColumnWithBackgroundImages } from "~/components/BlogSectionsThreeColumnWithBackgroundImages";
import { BlogSectionsThreeColumnWithImages } from "~/components/BlogSectionsThreeColumnWithImages";
import { BlogSectionsWithFeaturedPost } from "~/components/BlogSectionsWithFeaturedPost";
import { BlogSectionsWithPhotoAndList } from "~/components/BlogSectionsWithPhotoAndList";

const meta: Meta = {
  title: "Marketing/Sections/Blog Sections",
};

export default meta;

export const SingleColumn: StoryObj = {
  render: () => <BlogSectionsSingleColumn />,
};

export const SingleColumnWithImages: StoryObj = {
  render: () => <BlogSectionsSingleColumnWithImages />,
};

export const ThreeColumn: StoryObj = {
  render: () => <BlogSectionsThreeColumn />,
};

export const ThreeColumnWithBackgroundImages: StoryObj = {
  render: () => <BlogSectionsThreeColumnWithBackgroundImages />,
};

export const ThreeColumnWithImages: StoryObj = {
  render: () => <BlogSectionsThreeColumnWithImages />,
};

export const WithFeaturedPost: StoryObj = {
  render: () => <BlogSectionsWithFeaturedPost />,
};

export const WithPhotoAndList: StoryObj = {
  render: () => <BlogSectionsWithPhotoAndList />,
};
