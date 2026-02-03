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
import type { MenuItem, NodeAttrMark } from "@shared/editor/types";
import type { Dictionary } from "~/hooks/useDictionary";
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
  dictionary: Dictionary,
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
      tooltip: dictionary.alignLeft,
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
      tooltip: dictionary.alignCenter,
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
      tooltip: dictionary.alignRight,
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
      tooltip: dictionary.sortAsc,
      attrs: { index, direction: "asc" },
      icon: <SortAscendingIcon />,
      disabled: tableHasRowspan(state),
    },
    {
      name: "sortTable",
      tooltip: dictionary.sortDesc,
      attrs: { index, direction: "desc" },
      icon: <SortDescendingIcon />,
      disabled: tableHasRowspan(state),
    },
    {
      name: "separator",
    },
    {
      tooltip: dictionary.background,
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
            label: dictionary.none,
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
          label: dictionary.toggleHeader,
          icon: <TableHeaderColumnIcon />,
          visible: index === 0,
        },
        {
          name: rtl ? "addColumnAfter" : "addColumnBefore",
          label: rtl ? dictionary.addColumnAfter : dictionary.addColumnBefore,
          icon: <InsertLeftIcon />,
          attrs: { index },
        },
        {
          name: rtl ? "addColumnBefore" : "addColumnAfter",
          label: rtl ? dictionary.addColumnBefore : dictionary.addColumnAfter,
          icon: <InsertRightIcon />,
          attrs: { index },
        },
        {
          name: "moveTableColumn",
          label: dictionary.moveColumnLeft,
          icon: <ArrowLeftIcon />,
          attrs: { from: index, to: index - 1 },
          visible: index > 0,
        },
        {
          name: "moveTableColumn",
          label: dictionary.moveColumnRight,
          icon: <ArrowRightIcon />,
          attrs: { from: index, to: index + 1 },
          visible: index < tableMap.map.width - 1,
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
          name: "distributeColumns",
          visible: selectedCols.length > 1,
          label: dictionary.distributeColumns,
          icon: <TableColumnsDistributeIcon />,
        },
        {
          name: "separator",
        },
        {
          name: "deleteColumn",
          dangerous: true,
          label: dictionary.deleteColumn,
          icon: <TrashIcon />,
        },
      ],
    },
  ];
}
