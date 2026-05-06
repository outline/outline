import type { TFunction } from "i18next";
import { PageBreakIcon, HorizontalRuleIcon } from "outline-icons";
import type { EditorState } from "prosemirror-state";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import type { MenuItem } from "@shared/editor/types";

export default function dividerMenuItems(
  state: EditorState,
  readOnly: boolean,
  t: TFunction
): MenuItem[] {
  if (readOnly) {
    return [];
  }
  const { schema } = state;

  return [
    {
      name: "hr",
      tooltip: t("Divider"),
      attrs: { markup: "---" },
      active: isNodeActive(schema.nodes.hr, { markup: "---" }),
      icon: <HorizontalRuleIcon />,
    },
    {
      name: "hr",
      tooltip: t("Page break"),
      attrs: { markup: "***" },
      active: isNodeActive(schema.nodes.hr, { markup: "***" }),
      icon: <PageBreakIcon />,
    },
  ];
}
