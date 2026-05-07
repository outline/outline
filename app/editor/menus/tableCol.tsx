import {
  TrashIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignCenterIcon,
  InsertLeftIcon,
  InsertRightIcon,
  MoreIcon,
  PaletteIcon,
  TableHeaderColumnIcon,
  TableMergeCellsIcon,
  TableSplitCellsIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  TableColumnsDistributeIcon,
} from "outline-icons";
import type { EditorState } from "prosemirror-state";
import { CellSelection, selectedRect } from "prosemirror-tables";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import {
  getAllSelectedColumns,
  getCellsInColumn,
  isMergedCellSelection,
  isMultipleCellSelection,
  tableHasRowspan,
} from "@shared/editor/queries/table";
import type { TFunction } from "i18next";
import type { MenuItem, NodeAttrMark } from "@shared/editor/types";
import { ArrowLeftIcon, ArrowRightIcon } from "~/components/Icons/ArrowIcon";
import CircleIcon from "~/components/Icons/CircleIcon";
import CellBackgroundColorPicker from "../components/CellBackgroundColorPicker";
import TableCell from "@shared/editor/nodes/TableCell";
import { DottedCircleIcon } from "~/components/Icons/DottedCircleIcon";

/**
 * Get the set of background colors used in a column
 */
function getColumnColors(state: EditorState, colIndex: number): Set<string> {
  const colors = new Set<string>();
  const cells = getCellsInColumn(colIndex)(state) || [];

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

export default function tableColMenuItems(
  state: EditorState,
  readOnly: boolean,
  t: TFunction,
  options: {
    index: number;
    rtl: boolean;
  }
): MenuItem[] {
  if (readOnly) {
    return [];
  }

  const { index, rtl } = options;
  const { schema, selection } = state;
  const selectedCols = getAllSelectedColumns(state);

  if (!(selection instanceof CellSelection)) {
    return [];
  }

  const tableMap = selectedRect(state);
  const colColors = getColumnColors(state, index);
  const hasBackground = colColors.size > 0;
  const activeColor =
    colColors.size === 1 ? colColors.values().next().value : null;
  const customColor =
    colColors.size === 1 && !TableCell.isPresetColor(activeColor)
      ? activeColor
      : undefined;

  return [
    {
      name: "setColumnAttr",
      tooltip: t("Align left"),
      icon: <AlignLeftIcon />,
      attrs: { index, alignment: "left" },
      active: isNodeActive(schema.nodes.th, {
        colspan: 1,
        rowspan: 1,
        alignment: "left",
      }),
    },
    {
      name: "setColumnAttr",
      tooltip: t("Align center"),
      icon: <AlignCenterIcon />,
      attrs: { index, alignment: "center" },
      active: isNodeActive(schema.nodes.th, {
        colspan: 1,
        rowspan: 1,
        alignment: "center",
      }),
    },
    {
      name: "setColumnAttr",
      tooltip: t("Align right"),
      icon: <AlignRightIcon />,
      attrs: { index, alignment: "right" },
      active: isNodeActive(schema.nodes.th, {
        colspan: 1,
        rowspan: 1,
        alignment: "right",
      }),
    },
    {
      name: "separator",
    },
    {
      name: "sortTable",
      tooltip: t("Sort ascending"),
      attrs: { index, direction: "asc" },
      icon: <SortAscendingIcon />,
      disabled: tableHasRowspan(state),
    },
    {
      name: "sortTable",
      tooltip: t("Sort descending"),
      attrs: { index, direction: "desc" },
      icon: <SortDescendingIcon />,
      disabled: tableHasRowspan(state),
    },
    {
      name: "separator",
    },
    {
      tooltip: t("Background color"),
      icon:
        colColors.size > 1 ? (
          <CircleIcon color="rainbow" />
        ) : colColors.size === 1 ? (
          <CircleIcon color={colColors.values().next().value} />
        ) : (
          <PaletteIcon />
        ),
      children: [
        ...[
          {
            name: "toggleColumnBackgroundAndCollapseSelection",
            label: t("None"),
            icon: <DottedCircleIcon retainColor color="transparent" />,
            active: () => (hasBackground ? false : true),
            attrs: { color: null },
          },
        ],
        ...TableCell.presetColors.map((preset) => ({
          name: "toggleColumnBackgroundAndCollapseSelection",
          label: preset.name,
          icon: <CircleIcon retainColor color={preset.hex} />,
          active: () => colColors.size === 1 && colColors.has(preset.hex),
          attrs: { color: preset.hex },
        })),
        ...(customColor
          ? [
              {
                name: "toggleColumnBackgroundAndCollapseSelection",
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
                  command="toggleColumnBackground"
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
          name: "toggleHeaderColumn",
          label: t("Toggle header"),
          icon: <TableHeaderColumnIcon />,
          visible: index === 0,
        },
        {
          name: rtl ? "addColumnAfter" : "addColumnBefore",
          label: rtl ? t("Insert after") : t("Insert before"),
          icon: <InsertLeftIcon />,
          attrs: { index },
        },
        {
          name: rtl ? "addColumnBefore" : "addColumnAfter",
          label: rtl ? t("Insert before") : t("Insert after"),
          icon: <InsertRightIcon />,
          attrs: { index },
        },
        {
          name: "moveTableColumn",
          label: t("Move left"),
          icon: <ArrowLeftIcon />,
          attrs: { from: index, to: index - 1 },
          visible: index > 0,
        },
        {
          name: "moveTableColumn",
          label: t("Move right"),
          icon: <ArrowRightIcon />,
          attrs: { from: index, to: index + 1 },
          visible: index < tableMap.map.width - 1,
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
          name: "distributeColumns",
          visible: selectedCols.length > 1,
          label: t("Distribute columns"),
          icon: <TableColumnsDistributeIcon />,
        },
        {
          name: "separator",
        },
        {
          name: "deleteColumn",
          dangerous: true,
          label: t("Delete"),
          icon: <TrashIcon />,
        },
      ],
    },
  ];
}
