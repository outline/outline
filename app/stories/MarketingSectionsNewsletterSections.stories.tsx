import type { Meta, StoryObj } from "@storybook/react";
import { NewsletterSectionsCenteredCard } from "~/components/NewsletterSectionsCenteredCard";
import { NewsletterSectionsSideBySideOnCard } from "~/components/NewsletterSectionsSideBySideOnCard";
import { NewsletterSectionsSideBySideWithDetails } from "~/components/NewsletterSectionsSideBySideWithDetails";
import { NewsletterSectionsSimpleSideBySide } from "~/components/NewsletterSectionsSimpleSideBySide";
import { NewsletterSectionsSimpleSideBySideOnBrand } from "~/components/NewsletterSectionsSimpleSideBySideOnBrand";
import { NewsletterSectionsSimpleSideBySideOnDark } from "~/components/NewsletterSectionsSimpleSideBySideOnDark";
import { NewsletterSectionsSimpleStacked } from "~/components/NewsletterSectionsSimpleStacked";
const meta: Meta = {
  title: "Marketing/Sections/Newsletter Sections",
};
export default meta;
export const CenteredCard: StoryObj = {
  render: () => <NewsletterSectionsCenteredCard />,
};
export const SideBySideOnCard: StoryObj = {
  render: () => <NewsletterSectionsSideBySideOnCard />,
};
export const SideBySideWithDetails: StoryObj = {
  render: () => <NewsletterSectionsSideBySideWithDetails />,
};
export const SimpleSideBySide: StoryObj = {
  render: () => <NewsletterSectionsSimpleSideBySide />,
};
export const SimpleSideBySideOnBrand: StoryObj = {
  render: () => <NewsletterSectionsSimpleSideBySideOnBrand />,
};
export const SimpleSideBySideOnDark: StoryObj = {
  render: () => <NewsletterSectionsSimpleSideBySideOnDark />,
};
export const SimpleStacked: StoryObj = {
  render: () => <NewsletterSectionsSimpleStacked />,
};
