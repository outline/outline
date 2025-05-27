import {
  PlusIcon,
  MoreIcon,
} from "outline-icons";
import { EditorState } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import * as React from "react";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function tableCellMenuItems(
  state: EditorState,
  dictionary: Dictionary
): MenuItem[] {
  const { selection } = state;
  
  // Only show menu items if we have a CellSelection
  if (!(selection instanceof CellSelection)) {
    return [];
  }

  return [
    {
      name: "mergeCells",
      tooltip: dictionary.mergeCells,
      icon: <PlusIcon />,
      visible: selection.isColSelection() || selection.isRowSelection() || selection.$anchorCell.pos !== selection.$headCell.pos,
    },
    {
      name: "splitCell",
      tooltip: dictionary.splitCell,
      icon: <MoreIcon />,
    },
  ];
}
