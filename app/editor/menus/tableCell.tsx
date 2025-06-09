import { TableSplitCellsIcon, TableMergeCellsIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import {
  isMergedCellSelection,
  isMultipleCellSelection,
} from "@shared/editor/queries/table";
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
      label: dictionary.mergeCells,
      icon: <TableMergeCellsIcon />,
      visible: isMultipleCellSelection(state),
    },
    {
      name: "splitCell",
      label: dictionary.splitCell,
      icon: <TableSplitCellsIcon />,
      visible: isMergedCellSelection(state),
    },
  ];
}
