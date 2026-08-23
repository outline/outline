import type { Meta, StoryObj } from "@storybook/react";
import { TestimonialsGrid } from "~/components/TestimonialsGrid";
import { TestimonialsOffWhiteGrid } from "~/components/TestimonialsOffWhiteGrid";
import { TestimonialsSideBySide } from "~/components/TestimonialsSideBySide";
import { TestimonialsSideBySideOnDark } from "~/components/TestimonialsSideBySideOnDark";
import { TestimonialsSimpleCentered } from "~/components/TestimonialsSimpleCentered";
import { TestimonialsWithBackgroundImage } from "~/components/TestimonialsWithBackgroundImage";
import { TestimonialsWithLargeAvatar } from "~/components/TestimonialsWithLargeAvatar";
import { TestimonialsWithOverlappingImage } from "~/components/TestimonialsWithOverlappingImage";
import { TestimonialsWithStarRating } from "~/components/TestimonialsWithStarRating";
const meta: Meta = {
  title: "Marketing/Sections/Testimonials",
};
export default meta;
export const Grid: StoryObj = {
  render: () => <TestimonialsGrid />,
};
export const OffWhiteGrid: StoryObj = {
  render: () => <TestimonialsOffWhiteGrid />,
};
export const SideBySide: StoryObj = {
  render: () => <TestimonialsSideBySide />,
};
export const SideBySideOnDark: StoryObj = {
  render: () => <TestimonialsSideBySideOnDark />,
};
export const SimpleCentered: StoryObj = {
  render: () => <TestimonialsSimpleCentered />,
};
export const WithBackgroundImage: StoryObj = {
  render: () => <TestimonialsWithBackgroundImage />,
};
export const WithLargeAvatar: StoryObj = {
  render: () => <TestimonialsWithLargeAvatar />,
};
export const WithOverlappingImage: StoryObj = {
  render: () => <TestimonialsWithOverlappingImage />,
};
export const WithStarRating: StoryObj = {
  render: () => <TestimonialsWithStarRating />,
};
