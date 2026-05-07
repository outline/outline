import {
  TrashIcon,
  InsertAboveIcon,
  InsertBelowIcon,
  MoreIcon,
  PaletteIcon,
  TableHeaderRowIcon,
  TableSplitCellsIcon,
  TableMergeCellsIcon,
} from "outline-icons";
import type { EditorState } from "prosemirror-state";
import { CellSelection, selectedRect } from "prosemirror-tables";
import {
  getCellsInRow,
  isMergedCellSelection,
  isMultipleCellSelection,
} from "@shared/editor/queries/table";
import type { TFunction } from "i18next";
import type { MenuItem, NodeAttrMark } from "@shared/editor/types";
import { ArrowDownIcon, ArrowUpIcon } from "~/components/Icons/ArrowIcon";
import CircleIcon from "~/components/Icons/CircleIcon";
import CellBackgroundColorPicker from "../components/CellBackgroundColorPicker";
import TableCell from "@shared/editor/nodes/TableCell";
import { DottedCircleIcon } from "~/components/Icons/DottedCircleIcon";

/**
 * Get the set of background colors used in a row
 */
function getRowColors(state: EditorState, rowIndex: number): Set<string> {
  const colors = new Set<string>();
  const cells = getCellsInRow(rowIndex)(state) || [];

  cells.forEach((pos) => {
    const node = state.doc.nodeAt(pos);
    if (!node) {
      return;
    }
    const backgroundMark = (node.attrs.marks ?? []).find(
      (mark: NodeAttrMark) => mark.type === "background"
    );
    if (backgroundMark && backgroundMark.attrs.color) {
      colors.add(backgroundMark.attrs.color);
    }
  });

  return colors;
}

export default function tableRowMenuItems(
  state: EditorState,
  readOnly: boolean,
  t: TFunction,
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
  const rowColors = getRowColors(state, index);
  const hasBackground = rowColors.size > 0;
  const activeColor =
    rowColors.size === 1 ? rowColors.values().next().value : null;
  const customColor =
    rowColors.size === 1
      ? [...rowColors].find((c) => !TableCell.isPresetColor(c))
      : undefined;

  return [
    {
      tooltip: t("Background color"),
      icon:
        rowColors.size > 1 ? (
          <CircleIcon color="rainbow" />
        ) : rowColors.size === 1 ? (
          <CircleIcon color={rowColors.values().next().value} />
        ) : (
          <PaletteIcon />
        ),
      children: [
        ...[
          {
            name: "toggleRowBackgroundAndCollapseSelection",
            label: t("None"),
            icon: <DottedCircleIcon retainColor color="transparent" />,
            active: () => (hasBackground ? false : true),
            attrs: { color: null },
          },
        ],
        ...TableCell.presetColors.map((preset) => ({
          name: "toggleRowBackgroundAndCollapseSelection",
          label: preset.name,
          icon: <CircleIcon retainColor color={preset.hex} />,
          active: () => rowColors.size === 1 && rowColors.has(preset.hex),
          attrs: { color: preset.hex },
        })),
        ...(customColor
          ? [
              {
                name: "toggleRowBackgroundAndCollapseSelection",
                label: customColor,
                icon: <CircleIcon retainColor color={customColor} />,
                active: () => true,
                attrs: { color: customColor },
              },
            ]
          : []),
        {
          icon: <CircleIcon retainColor color="rainbow" />,
          label: "Custom",
          children: [
            {
              content: (
                <CellBackgroundColorPicker
                  activeColor={activeColor}
                  command="toggleRowBackground"
                />
              ),
              preventCloseCondition: () =>
                !!document.activeElement?.matches(
                  ".ProseMirror.ProseMirror-focused"
                ),
            },
          ],
        },
      ],
    },
    {
      icon: <MoreIcon />,
      children: [
        {
          name: "toggleHeaderRow",
          label: t("Toggle header"),
          icon: <TableHeaderRowIcon />,
          visible: index === 0,
        },
        {
          name: "addRowBefore",
          label: t("Insert before"),
          icon: <InsertAboveIcon />,
          attrs: { index },
        },
        {
          name: "addRowAfter",
          label: t("Insert after"),
          icon: <InsertBelowIcon />,
          attrs: { index },
        },
        {
          name: "moveTableRow",
          label: t("Move up"),
          icon: <ArrowUpIcon />,
          attrs: { from: index, to: index - 1 },
          visible: index > 0,
        },
        {
          name: "moveTableRow",
          label: t("Move down"),
          icon: <ArrowDownIcon />,
          attrs: { from: index, to: index + 1 },
          visible: index < tableMap.map.height - 1,
        },
        {
          name: "separator",
        },
        {
          name: "mergeCells",
          label: t("Merge cells"),
          icon: <TableMergeCellsIcon />,
          visible: isMultipleCellSelection(state),
        },
        {
          name: "splitCell",
          label: t("Split cell"),
          icon: <TableSplitCellsIcon />,
          visible: isMergedCellSelection(state),
        },
        {
          name: "separator",
        },
        {
          name: "deleteRow",
          label: t("Delete"),
          dangerous: true,
          icon: <TrashIcon />,
        },
      ],
    },
  ];
}
