import {
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  BlockQuoteIcon,
  LinkIcon,
  StrikethroughIcon,
  OrderedListIcon,
  BulletedListIcon,
  TodoListIcon,
  InputIcon,
  HighlightIcon,
  CommentIcon,
  ItalicIcon,
  OutdentIcon,
  IndentIcon,
  CopyIcon,
  Heading3Icon,
  TableMergeCellsIcon,
  TableSplitCellsIcon,
  PaletteIcon,
  CollapseIcon,
} from "outline-icons";
import { v4 as uuidv4 } from "uuid";
import CellBackgroundColorPicker from "../components/CellBackgroundColorPicker";
import HighlightColorPicker from "../components/HighlightColorPicker";
import type { EditorState } from "prosemirror-state";

import { getDocumentHighlightColors } from "@shared/editor/queries/getDocumentHighlightColors";
import { getMarksBetween } from "@shared/editor/queries/getMarksBetween";
import { isInCode } from "@shared/editor/queries/isInCode";
import { isInList } from "@shared/editor/queries/isInList";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import type { MenuItem } from "@shared/editor/types";
import { metaDisplay } from "@shared/utils/keyboard";
import CircleIcon from "~/components/Icons/CircleIcon";
import type { Dictionary } from "~/hooks/useDictionary";
import {
  isMobile as isMobileDevice,
  isTouchDevice,
} from "@shared/utils/browser";
import {
  getColorSetForSelectedCells,
  getDocumentTableBackgroundColors,
  hasNodeAttrMarkCellSelection,
  hasNodeAttrMarkWithAttrsCellSelection,
  isMergedCellSelection,
  isMultipleCellSelection,
} from "@shared/editor/queries/table";
import { CellSelection } from "prosemirror-tables";
import TableCell from "@shared/editor/nodes/TableCell";
import Highlight from "@shared/editor/marks/Highlight";
import { DottedCircleIcon } from "~/components/Icons/DottedCircleIcon";

export default function formattingMenuItems(
  state: EditorState,
  isTemplate: boolean,
  dictionary: Dictionary
): MenuItem[] {
  const { schema } = state;
  const isCode = isInCode(state);
  const isCodeBlock = isInCode(state, { onlyBlock: true });
  const isEmpty = state.selection.empty;
  const isMobile = isMobileDevice();
  const isTouch = isTouchDevice();
  const isList = isInList(state);
  const isTableCell = state.selection instanceof CellSelection;

  const highlight = getMarksBetween(
    state.selection.from,
    state.selection.to,
    state
  ).find(({ mark }) => mark.type === state.schema.marks.highlight);

  const cellSelectionHasBackground = isTableCell
    ? hasNodeAttrMarkCellSelection(
        state.selection as CellSelection,
        "background"
      )
    : false;

  const selectedCellsColorSet = getColorSetForSelectedCells(state.selection);

  return [
    {
      name: "placeholder",
      tooltip: dictionary.placeholder,
      icon: <InputIcon />,
      active: isMarkActive(schema.marks.placeholder),
      visible: isTemplate && (!isMobile || !isEmpty),
    },
    {
      name: "separator",
      visible: isTemplate && (!isMobile || !isEmpty),
    },
    {
      name: "strong",
      tooltip: dictionary.strong,
      shortcut: `${metaDisplay}+B`,
      icon: <BoldIcon />,
      active: isMarkActive(schema.marks.strong),
      visible: !isCodeBlock && (!isMobile || !isEmpty),
    },
    {
      name: "em",
      tooltip: dictionary.em,
      shortcut: `${metaDisplay}+I`,
      icon: <ItalicIcon />,
      active: isMarkActive(schema.marks.em),
      visible: !isCodeBlock && (!isMobile || !isEmpty),
    },
    {
      name: "strikethrough",
      tooltip: dictionary.strikethrough,
      shortcut: `${metaDisplay}+D`,
      icon: <StrikethroughIcon />,
      active: isMarkActive(schema.marks.strikethrough),
      visible: !isCodeBlock && (!isMobile || !isEmpty),
    },
    {
      tooltip: dictionary.background,
      icon:
        getColorSetForSelectedCells(state.selection).size > 1 ? (
          <CircleIcon color="rainbow" />
        ) : getColorSetForSelectedCells(state.selection).size === 1 ? (
          <CircleIcon
            color={
              getColorSetForSelectedCells(state.selection).values().next().value
            }
          />
        ) : (
          <PaletteIcon />
        ),
      visible: !isCode && (!isMobile || !isEmpty) && isTableCell,
      children: (): MenuItem[] => {
        // Get all unique background colors used in table cells (lazily computed when menu opens)
        const documentTableColors = getDocumentTableBackgroundColors(state);

        // Filter out preset colors and currently selected colors
        const nonPresetDocumentColors = documentTableColors.filter(
          (color: string) =>
            !TableCell.isPresetColor(color) && !selectedCellsColorSet.has(color)
        );

        return [
          {
            name: "toggleCellSelectionBackgroundAndCollapseSelection",
            label: dictionary.none,
            icon: <DottedCircleIcon retainColor color="transparent" />,
            active: () => (cellSelectionHasBackground ? false : true),
            attrs: { color: null },
          },
          ...TableCell.presetColors.map((preset) => ({
            name: "toggleCellSelectionBackgroundAndCollapseSelection",
            label: preset.name,
            icon: <CircleIcon retainColor color={preset.hex} />,
            active: () =>
              hasNodeAttrMarkWithAttrsCellSelection(
                state.selection as CellSelection,
                "background",
                { color: preset.hex }
              ),
            attrs: { color: preset.hex },
          })),
          ...(selectedCellsColorSet.size === 1 &&
          !TableCell.isPresetColor(selectedCellsColorSet.values().next().value)
            ? [
                {
                  name: "toggleCellSelectionBackgroundAndCollapseSelection",
                  label: selectedCellsColorSet.values().next().value,
                  icon: (
                    <CircleIcon
                      retainColor
                      color={selectedCellsColorSet.values().next().value}
                    />
                  ),
                  active: () => true,
                  attrs: { color: selectedCellsColorSet.values().next().value },
                },
              ]
            : []),
          // Add all other document table background colors
          ...nonPresetDocumentColors.map((color: string) => ({
            name: "toggleCellSelectionBackgroundAndCollapseSelection",
            label: color,
            icon: <CircleIcon retainColor color={color} />,
            active: () => selectedCellsColorSet.has(color),
            attrs: { color },
          })),
          {
            icon: <CircleIcon retainColor color="rainbow" />,
            label: "Custom",
            children: [
              {
                content: (
                  <CellBackgroundColorPicker
                    command="toggleCellSelectionBackground"
                    activeColor={
                      selectedCellsColorSet.size === 1
                        ? selectedCellsColorSet.values().next().value
                        : ""
                    }
                  />
                ),
                preventCloseCondition: () =>
                  !!document.activeElement?.matches(
                    ".ProseMirror.ProseMirror-focused"
                  ),
              },
            ],
          },
        ];
      },
    },
    {
      tooltip: dictionary.mark,
      shortcut: `${metaDisplay}+⇧+H`,
      icon: highlight ? (
        <CircleIcon
          color={highlight.mark.attrs.color || Highlight.presetColors[0].hex}
        />
      ) : (
        <HighlightIcon />
      ),
      active: () => !!highlight,
      visible: !isCode && (!isMobile || !isEmpty) && !isTableCell,
      children: (): MenuItem[] => {
        // Get all unique highlight colors used in the document (lazily computed when menu opens)
        const documentHighlightColors = getDocumentHighlightColors(state);

        // Filter out preset colors and the currently selected color
        const currentHighlightColor = highlight?.mark.attrs.color;
        const nonPresetDocumentColors = documentHighlightColors.filter(
          (color: string) =>
            !Highlight.isPresetColor(color) && color !== currentHighlightColor
        );

        return [
          ...(highlight
            ? [
                {
                  name: "highlight",
                  label: dictionary.none,
                  icon: <DottedCircleIcon retainColor color="transparent" />,
                  active: () => false,
                  attrs: { color: highlight.mark.attrs.color },
                },
              ]
            : []),
          ...Highlight.presetColors.map((preset) => ({
            name: "highlight",
            label: preset.name,
            icon: <CircleIcon retainColor color={preset.hex} />,
            active: isMarkActive(schema.marks.highlight, { color: preset.hex }),
            attrs: { color: preset.hex },
          })),
          ...(highlight &&
          highlight.mark.attrs.color &&
          !Highlight.isPresetColor(highlight.mark.attrs.color)
            ? [
                {
                  name: "highlight",
                  label: highlight.mark.attrs.color,
                  icon: (
                    <CircleIcon
                      retainColor
                      color={highlight.mark.attrs.color}
                    />
                  ),
                  active: isMarkActive(schema.marks.highlight, {
                    color: highlight.mark.attrs.color,
                  }),
                  attrs: { color: highlight.mark.attrs.color },
                },
              ]
            : []),
          // Add all other document highlight colors
          ...nonPresetDocumentColors.map((color: string) => ({
            name: "highlight",
            label: color,
            icon: <CircleIcon retainColor color={color} />,
            active: () => currentHighlightColor === color,
            attrs: { color },
          })),
          {
            icon: <CircleIcon retainColor color="rainbow" />,
            label: "Custom",
            children: [
              {
                content: (
                  <HighlightColorPicker
                    activeColor={
                      highlight?.mark.attrs.color ||
                      Highlight.presetColors[0].hex
                    }
                  />
                ),
                preventCloseCondition: () =>
                  !!document.activeElement?.matches(
                    ".ProseMirror.ProseMirror-focused"
                  ),
              },
            ],
          },
        ];
      },
    },
    {
      name: "code_inline",
      tooltip: dictionary.codeInline,
      shortcut: `${metaDisplay}+E`,
      icon: <CodeIcon />,
      active: isMarkActive(schema.marks.code_inline),
      visible: !isCodeBlock && (!isMobile || !isEmpty),
    },
    {
      name: "separator",
      visible: !isCodeBlock,
    },
    {
      name: "heading",
      tooltip: dictionary.heading,
      shortcut: `⇧+Ctrl+1`,
      icon: <Heading1Icon />,
      active: isNodeActive(schema.nodes.heading, { level: 1 }),
      attrs: { level: 1 },
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "heading",
      tooltip: dictionary.subheading,
      shortcut: `⇧+Ctrl+2`,
      icon: <Heading2Icon />,
      active: isNodeActive(schema.nodes.heading, { level: 2 }),
      attrs: { level: 2 },
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "heading",
      tooltip: dictionary.subheading,
      shortcut: `⇧+Ctrl+3`,
      icon: <Heading3Icon />,
      active: isNodeActive(schema.nodes.heading, { level: 3 }),
      attrs: { level: 3 },
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "blockquote",
      tooltip: dictionary.quote,
      shortcut: `${metaDisplay}+]`,
      icon: <BlockQuoteIcon />,
      active: isNodeActive(schema.nodes.blockquote),
      attrs: { level: 2 },
      visible: !isCodeBlock && !isTableCell && (!isMobile || isEmpty),
    },
    {
      name: "separator",
    },
    {
      name: "mergeCells",
      tooltip: dictionary.mergeCells,
      icon: <TableMergeCellsIcon />,
      visible: isMultipleCellSelection(state),
    },
    {
      name: "splitCell",
      tooltip: dictionary.splitCell,
      icon: <TableSplitCellsIcon />,
      visible: isMergedCellSelection(state),
    },
    {
      name: "container_toggle",
      icon: <CollapseIcon />,
      tooltip: dictionary.toggleBlock,
      active: isNodeActive(schema.nodes.container_toggle),
      attrs: { id: uuidv4() },
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "separator",
    },
    {
      name: "checkbox_list",
      tooltip: dictionary.checkboxList,
      shortcut: `⇧+Ctrl+7`,
      icon: <TodoListIcon />,
      keywords: "checklist checkbox task",
      active: isNodeActive(schema.nodes.checkbox_list),
      visible: !isCodeBlock && !isTableCell && (!isList || !isTouch),
    },
    {
      name: "bullet_list",
      tooltip: dictionary.bulletList,
      shortcut: `⇧+Ctrl+8`,
      icon: <BulletedListIcon />,
      active: isNodeActive(schema.nodes.bullet_list),
      visible: !isCodeBlock && !isTableCell && (!isList || !isTouch),
    },
    {
      name: "ordered_list",
      tooltip: dictionary.orderedList,
      shortcut: `⇧+Ctrl+9`,
      icon: <OrderedListIcon />,
      active: isNodeActive(schema.nodes.ordered_list),
      visible: !isCodeBlock && !isTableCell && (!isList || !isTouch),
    },
    {
      name: "outdentList",
      tooltip: dictionary.outdent,
      shortcut: `⇧+Tab`,
      icon: <OutdentIcon />,
      visible: isTouch && isList,
    },
    {
      name: "indentList",
      tooltip: dictionary.indent,
      shortcut: `Tab`,
      icon: <IndentIcon />,
      visible: isTouch && isList,
    },
    {
      name: "outdentCheckboxList",
      tooltip: dictionary.outdent,
      shortcut: `⇧+Tab`,
      icon: <OutdentIcon />,
      visible: isTouch && isInList(state, { types: ["checkbox_list"] }),
    },
    {
      name: "indentCheckboxList",
      tooltip: dictionary.indent,
      shortcut: `Tab`,
      icon: <IndentIcon />,
      visible: isTouch && isInList(state, { types: ["checkbox_list"] }),
    },
    {
      name: "separator",
      visible: !isCodeBlock,
    },
    {
      name: "addLink",
      tooltip: dictionary.createLink,
      shortcut: `${metaDisplay}+K`,
      icon: <LinkIcon />,
      attrs: { href: "" },
      active: isMarkActive(schema.marks.link, undefined, { exact: true }),
      visible: !isCodeBlock && (!isMobile || !isEmpty),
    },
    {
      name: "comment",
      tooltip: dictionary.comment,
      shortcut: `${metaDisplay}+⌥+M`,
      icon: <CommentIcon />,
      label: isCodeBlock ? dictionary.comment : undefined,
      active: isMarkActive(
        schema.marks.comment,
        { resolved: false },
        { exact: true }
      ),
      visible: !isMobile || !isEmpty,
    },
    {
      name: "separator",
      visible: isCode && !isCodeBlock && (!isMobile || !isEmpty),
    },
    {
      name: "copyToClipboard",
      icon: <CopyIcon />,
      tooltip: dictionary.copy,
      shortcut: `${metaDisplay}+C`,
      visible: isCode && !isCodeBlock && (!isMobile || !isEmpty),
    },
  ];
}
