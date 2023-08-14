import { TrashIcon, InsertAboveIcon, InsertBelowIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function tableRowMenuItems(
  state: EditorState,
  index: number,
  dictionary: Dictionary
): MenuItem[] {
  return [
    {
      name: "addRowAfter",
      tooltip: dictionary.addRowBefore,
      icon: <InsertAboveIcon />,
      attrs: { index: index - 1 },
      visible: index !== 0,
    },
    {
      name: "addRowAfter",
      tooltip: dictionary.addRowAfter,
      icon: <InsertBelowIcon />,
      attrs: { index },
    },
    {
      name: "separator",
    },
    {
      name: "deleteRow",
      tooltip: dictionary.deleteRow,
      icon: <TrashIcon />,
    },
  ];
}
