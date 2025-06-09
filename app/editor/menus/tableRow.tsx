import {
  TrashIcon,
  InsertAboveIcon,
  InsertBelowIcon,
  MoreIcon,
  TableHeaderRowIcon,
  TableSplitCellsIcon,
  TableMergeCellsIcon,
} from "outline-icons";
import { EditorState } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import {
  isMergedCellSelection,
  isMultipleCellSelection,
} from "@shared/editor/queries/table";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function tableRowMenuItems(
  state: EditorState,
  index: number,
  dictionary: Dictionary
): MenuItem[] {
  const { selection } = state;
  if (!(selection instanceof CellSelection)) {
    return [];
  }

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
          name: "addRowBefore",
          label: dictionary.addRowBefore,
          icon: <InsertAboveIcon />,
          attrs: { index },
        },
        {
          name: "addRowAfter",
          label: dictionary.addRowAfter,
          icon: <InsertBelowIcon />,
          attrs: { index },
        },
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
        {
          name: "separator",
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
