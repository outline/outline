import { PageBreakIcon, HorizontalRuleIcon } from "outline-icons";
import type { EditorState } from "prosemirror-state";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import type { MenuItem } from "@shared/editor/types";
import type { Dictionary } from "~/hooks/useDictionary";

export default function dividerMenuItems(
  state: EditorState,
  readOnly: boolean,
  dictionary: Dictionary
): MenuItem[] {
  if (readOnly) {
    return [];
  }
  const { schema } = state;

  return [
    {
      name: "hr",
      tooltip: dictionary.hr,
      attrs: { markup: "---" },
      active: isNodeActive(schema.nodes.hr, { markup: "---" }),
      icon: <HorizontalRuleIcon />,
    },
    {
      name: "hr",
      tooltip: dictionary.pageBreak,
      attrs: { markup: "***" },
      active: isNodeActive(schema.nodes.hr, { markup: "***" }),
      icon: <PageBreakIcon />,
    },
  ];
}
