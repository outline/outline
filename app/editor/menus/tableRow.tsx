import {
  TrashIcon,
  InsertAboveIcon,
  InsertBelowIcon,
  TableHeaderRowIcon,
  TableSplitCellsIcon,
  TableMergeCellsIcon,
} from "outline-icons";
import type { EditorState } from "prosemirror-state";
import { CellSelection, selectedRect } from "prosemirror-tables";
import {
  isMergedCellSelection,
  isMultipleCellSelection,
} from "@shared/editor/queries/table";
import type { MenuItem } from "@shared/editor/types";
import type { Dictionary } from "~/hooks/useDictionary";
import { ArrowDownIcon, ArrowUpIcon } from "~/components/Icons/ArrowIcon";

export default function tableRowMenuItems(
  state: EditorState,
  readOnly: boolean,
  dictionary: Dictionary,
  options: {
    index: number;
  }
): MenuItem[] {
  if (readOnly) {
    return [];
  }

  const { index } = options;
  const { selection } = state;

  if (!(selection instanceof CellSelection)) {
    return [];
  }

  const tableMap = selectedRect(state);

  return [
    {
      skipIcon: true,
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
          name: "moveTableRow",
          label: dictionary.moveRowUp,
          icon: <ArrowUpIcon />,
          attrs: { from: index, to: index - 1 },
          visible: index > 0,
        },
        {
          name: "moveTableRow",
          label: dictionary.moveRowDown,
          icon: <ArrowDownIcon />,
          attrs: { from: index, to: index + 1 },
          visible: index < tableMap.map.height - 1,
        },
        {
          name: "separator",
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
