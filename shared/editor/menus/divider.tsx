import { PageBreakIcon, HorizontalRuleIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import { Dictionary } from "../../hooks/useDictionary";
import isNodeActive from "../queries/isNodeActive";
import { MenuItem } from "../types";

export default function dividerMenuItems(
  state: EditorState,
  dictionary: Dictionary
): MenuItem[] {
  const { schema } = state;

  return [
    {
      name: "hr",
      tooltip: dictionary.pageBreak,
      attrs: { markup: "***" },
      active: isNodeActive(schema.nodes.hr, { markup: "***" }),
      icon: PageBreakIcon,
    },
    {
      name: "hr",
      tooltip: dictionary.hr,
      attrs: { markup: "---" },
      active: isNodeActive(schema.nodes.hr, { markup: "---" }),
      icon: HorizontalRuleIcon,
    },
  ];
}
