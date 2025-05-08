import {
  TrashIcon,
  InsertAboveIcon,
  InsertBelowIcon,
  TableHeaderRowIcon,
} from "outline-icons";
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
      name: "toggleHeaderRow",
      tooltip: dictionary.toggleHeader,
      icon: <TableHeaderRowIcon />,
      visible: index === 0,
    },
    {
      name: "addRowBefore",
      tooltip: dictionary.addRowBefore,
      icon: <InsertAboveIcon />,
      attrs: { index },
    },
    {
      name: "addRowAfter",
      tooltip: dictionary.addRowAfter,
      icon: <InsertBelowIcon />,
      attrs: { index },
    },
    {
      name: "deleteRow",
      tooltip: dictionary.deleteRow,
      icon: <TrashIcon />,
      dangerous: true,
    },
  ];
}
