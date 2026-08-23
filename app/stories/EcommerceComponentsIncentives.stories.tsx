import type { Meta, StoryObj } from "@storybook/react";
import { Incentives2x2GridWithIllustrations as Incentives2x2GridWithIllustrationsView } from "~/components/Incentives2x2GridWithIllustrations";
import { Incentives3ColumnWithIcons as Incentives3ColumnWithIconsView } from "~/components/Incentives3ColumnWithIcons";
import { Incentives3ColumnWithIconsAndSupportingText as Incentives3ColumnWithIconsAndSupportingTextView } from "~/components/Incentives3ColumnWithIconsAndSupportingText";
import { Incentives3ColumnWithIllustrationsAndCenteredText as Incentives3ColumnWithIllustrationsAndCenteredTextView } from "~/components/Incentives3ColumnWithIllustrationsAndCenteredText";
import { Incentives3ColumnWithIllustrationsAndHeader as Incentives3ColumnWithIllustrationsAndHeaderView } from "~/components/Incentives3ColumnWithIllustrationsAndHeader";
import { Incentives3ColumnWithIllustrationsAndHeading as Incentives3ColumnWithIllustrationsAndHeadingView } from "~/components/Incentives3ColumnWithIllustrationsAndHeading";
import { Incentives3ColumnWithIllustrationsAndSplitHeader as Incentives3ColumnWithIllustrationsAndSplitHeaderView } from "~/components/Incentives3ColumnWithIllustrationsAndSplitHeader";
import { Incentives4ColumnWithIllustrations as Incentives4ColumnWithIllustrationsView } from "~/components/Incentives4ColumnWithIllustrations";
const meta: Meta = {
  title: "Ecommerce/Components/Incentives",
};
export default meta;
export const Incentives2x2GridWithIllustrations: StoryObj = {
  render: () => <Incentives2x2GridWithIllustrationsView />,
};
export const Incentives3ColumnWithIcons: StoryObj = {
  render: () => <Incentives3ColumnWithIconsView />,
};
export const Incentives3ColumnWithIconsAndSupportingText: StoryObj = {
  render: () => <Incentives3ColumnWithIconsAndSupportingTextView />,
};
export const Incentives3ColumnWithIllustrationsAndCenteredText: StoryObj = {
  render: () => <Incentives3ColumnWithIllustrationsAndCenteredTextView />,
};
export const Incentives3ColumnWithIllustrationsAndHeader: StoryObj = {
  render: () => <Incentives3ColumnWithIllustrationsAndHeaderView />,
};
export const Incentives3ColumnWithIllustrationsAndHeading: StoryObj = {
  render: () => <Incentives3ColumnWithIllustrationsAndHeadingView />,
};
export const Incentives3ColumnWithIllustrationsAndSplitHeader: StoryObj = {
  render: () => <Incentives3ColumnWithIllustrationsAndSplitHeaderView />,
};
export const Incentives4ColumnWithIllustrations: StoryObj = {
  render: () => <Incentives4ColumnWithIllustrationsView />,
};
