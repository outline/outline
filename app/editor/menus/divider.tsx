import { PageBreakIcon, HorizontalRuleIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function dividerMenuItems(
  state: EditorState,
  dictionary: Dictionary
): MenuItem[] {
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
