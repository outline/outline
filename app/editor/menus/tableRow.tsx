import {
  TrashIcon,
  InsertAboveIcon,
  InsertBelowIcon,
  MoreIcon,
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
      icon: <MoreIcon />,
      children: [
        {
          name: "toggleHeaderRow",
          label: dictionary.toggleHeader,
          icon: <TableHeaderRowIcon />,
          visible: index === 0,
        },
        {
          name: "addRowAfter",
          label: dictionary.addRowBefore,
          icon: <InsertAboveIcon />,
          attrs: { index: index - 1 },
          visible: index !== 0,
        },
        {
          name: "addRowAfter",
          label: dictionary.addRowAfter,
          icon: <InsertBelowIcon />,
          attrs: { index },
        },
        {
          name: "deleteRow",
          label: dictionary.deleteRow,
          dangerous: true,
          icon: <TrashIcon />,
        },
      ],
    },
  ];
}
