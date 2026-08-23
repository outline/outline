import type { Meta, StoryObj } from "@storybook/react";
import { FaqSectionsCenteredAccordion } from "~/components/FaqSectionsCenteredAccordion";
import { FaqSectionsCenteredAccordionOnDark } from "~/components/FaqSectionsCenteredAccordionOnDark";
import { FaqSectionsOffsetWithSupportingText } from "~/components/FaqSectionsOffsetWithSupportingText";
import { FaqSectionsSideBySide } from "~/components/FaqSectionsSideBySide";
import { FaqSectionsThreeColumns } from "~/components/FaqSectionsThreeColumns";
import { FaqSectionsThreeColumnsOnDark } from "~/components/FaqSectionsThreeColumnsOnDark";
import { FaqSectionsThreeColumnsWithCenteredIntroduction } from "~/components/FaqSectionsThreeColumnsWithCenteredIntroduction";
import { FaqSectionsTwoColumns } from "~/components/FaqSectionsTwoColumns";
import { FaqSectionsTwoColumnsOnDark } from "~/components/FaqSectionsTwoColumnsOnDark";
import { FaqSectionsTwoColumnsWithCenteredIntroduction } from "~/components/FaqSectionsTwoColumnsWithCenteredIntroduction";
const meta: Meta = {
  title: "Marketing/Sections/Faq Sections",
};
export default meta;
export const CenteredAccordion: StoryObj = {
  render: () => <FaqSectionsCenteredAccordion />,
};
export const CenteredAccordionOnDark: StoryObj = {
  render: () => <FaqSectionsCenteredAccordionOnDark />,
};
export const OffsetWithSupportingText: StoryObj = {
  render: () => <FaqSectionsOffsetWithSupportingText />,
};
export const SideBySide: StoryObj = {
  render: () => <FaqSectionsSideBySide />,
};
export const ThreeColumns: StoryObj = {
  render: () => <FaqSectionsThreeColumns />,
};
export const ThreeColumnsOnDark: StoryObj = {
  render: () => <FaqSectionsThreeColumnsOnDark />,
};
export const ThreeColumnsWithCenteredIntroduction: StoryObj = {
  render: () => <FaqSectionsThreeColumnsWithCenteredIntroduction />,
};
export const TwoColumns: StoryObj = {
  render: () => <FaqSectionsTwoColumns />,
};
export const TwoColumnsOnDark: StoryObj = {
  render: () => <FaqSectionsTwoColumnsOnDark />,
};
export const TwoColumnsWithCenteredIntroduction: StoryObj = {
  render: () => <FaqSectionsTwoColumnsWithCenteredIntroduction />,
};
