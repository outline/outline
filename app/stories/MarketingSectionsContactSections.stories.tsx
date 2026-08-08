import type { Meta, StoryObj } from "@storybook/react";
import { ContactSectionsCentered } from "~/components/ContactSectionsCentered";
import { ContactSectionsSideBySideGrid } from "~/components/ContactSectionsSideBySideGrid";
import { ContactSectionsSimpleCentered } from "~/components/ContactSectionsSimpleCentered";
import { ContactSectionsSimpleFourColumn } from "~/components/ContactSectionsSimpleFourColumn";
import { ContactSectionsSplitWithImage } from "~/components/ContactSectionsSplitWithImage";
import { ContactSectionsSplitWithPattern } from "~/components/ContactSectionsSplitWithPattern";
import { ContactSectionsSplitWithPatternOnDark } from "~/components/ContactSectionsSplitWithPatternOnDark";
import { ContactSectionsWithTestimonial } from "~/components/ContactSectionsWithTestimonial";

const meta: Meta = {
  title: "Marketing/Sections/Contact Sections",
};

export default meta;

export const Centered: StoryObj = {
  render: () => <ContactSectionsCentered />,
};

export const SideBySideGrid: StoryObj = {
  render: () => <ContactSectionsSideBySideGrid />,
};

export const SimpleCentered: StoryObj = {
  render: () => <ContactSectionsSimpleCentered />,
};

export const SimpleFourColumn: StoryObj = {
  render: () => <ContactSectionsSimpleFourColumn />,
};

export const SplitWithImage: StoryObj = {
  render: () => <ContactSectionsSplitWithImage />,
};

export const SplitWithPattern: StoryObj = {
  render: () => <ContactSectionsSplitWithPattern />,
};

export const SplitWithPatternOnDark: StoryObj = {
  render: () => <ContactSectionsSplitWithPatternOnDark />,
};

export const WithTestimonial: StoryObj = {
  render: () => <ContactSectionsWithTestimonial />,
};
