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

import { getDocumentHighlightColors } from "@shared/editor/queries/getDocumentHighlightColors";
import { getMarksBetween } from "@shared/editor/queries/getMarksBetween";
import { isInList } from "@shared/editor/queries/isInList";
import { isListActive } from "@shared/editor/queries/isListActive";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import type { MenuItem, SelectionContext } from "@shared/editor/types";
import { metaDisplay } from "@shared/utils/keyboard";
import { t } from "i18next";
import CircleIcon from "~/components/Icons/CircleIcon";
import {
  getColorSetForSelectedCells,
  getDocumentTableBackgroundColors,
  hasNodeAttrMarkCellSelection,
  hasNodeAttrMarkWithAttrsCellSelection,
  isMergedCellSelection,
  isMultipleCellSelection,
} from "@shared/editor/queries/table";
import type { CellSelection } from "prosemirror-tables";
import TableCell from "@shared/editor/nodes/TableCell";
import Highlight from "@shared/editor/marks/Highlight";
import { DottedCircleIcon } from "~/components/Icons/DottedCircleIcon";

/**
 * Returns menu items for the default formatting selection toolbar.
 *
 * @param ctx - the current selection context.
 * @returns an array of menu items.
 */
export default function formattingMenuItems(ctx: SelectionContext): MenuItem[] {
  const {
    schema,
    state,
    isTemplate,
    isMobile,
    isTouch,
    isEmpty,
    isInCode,
    isInCodeBlock,
    isInList: isList,
    isTableCell,
  } = ctx;

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

  const canFormatInline = !isInCodeBlock && (!isMobile || !isEmpty);
  const canFormatBlock = !isInCodeBlock && (!isMobile || isEmpty);

  return [
    {
      name: "placeholder",
      tooltip: t("Placeholder"),
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
      tooltip: t("Bold"),
      shortcut: `${metaDisplay}+B`,
      icon: <BoldIcon />,
      active: isMarkActive(schema.marks.strong),
      visible: canFormatInline,
    },
    {
      name: "em",
      tooltip: t("Italic"),
      shortcut: `${metaDisplay}+I`,
      icon: <ItalicIcon />,
      active: isMarkActive(schema.marks.em),
      visible: canFormatInline,
    },
    {
      name: "strikethrough",
      tooltip: t("Strikethrough"),
      shortcut: `${metaDisplay}+D`,
      icon: <StrikethroughIcon />,
      active: isMarkActive(schema.marks.strikethrough),
      visible: canFormatInline,
    },
    {
      tooltip: t("Background color"),
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
      visible: !isInCode && (!isMobile || !isEmpty) && isTableCell,
      children: (): MenuItem[] => {
        const documentTableColors = getDocumentTableBackgroundColors(state);

        const nonPresetDocumentColors = documentTableColors.filter(
          (color: string) =>
            !TableCell.isPresetColor(color) && !selectedCellsColorSet.has(color)
        );

        return [
          {
            name: "toggleCellSelectionBackgroundAndCollapseSelection",
            label: t("None"),
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
      tooltip: t("Highlight"),
      shortcut: `${metaDisplay}+⇧+H`,
      icon: highlight ? (
        <CircleIcon
          color={highlight.mark.attrs.color || Highlight.presetColors[0].hex}
        />
      ) : (
        <HighlightIcon />
      ),
      active: () => !!highlight,
      visible: !isInCode && (!isMobile || !isEmpty) && !isTableCell,
      children: (): MenuItem[] => {
        const documentHighlightColors = getDocumentHighlightColors(state);

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
                  label: t("None"),
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
      tooltip: t("Code"),
      shortcut: `${metaDisplay}+E`,
      icon: <CodeIcon />,
      active: isMarkActive(schema.marks.code_inline),
      visible: canFormatInline,
    },
    {
      name: "separator",
      visible: !isInCodeBlock,
    },
    {
      name: "heading",
      tooltip: t("Heading"),
      shortcut: `⇧+Ctrl+1`,
      icon: <Heading1Icon />,
      active: isNodeActive(schema.nodes.heading, { level: 1 }),
      attrs: { level: 1 },
      visible: canFormatBlock,
    },
    {
      name: "heading",
      tooltip: t("Subheading"),
      shortcut: `⇧+Ctrl+2`,
      icon: <Heading2Icon />,
      active: isNodeActive(schema.nodes.heading, { level: 2 }),
      attrs: { level: 2 },
      visible: canFormatBlock,
    },
    {
      name: "heading",
      tooltip: t("Subheading"),
      shortcut: `⇧+Ctrl+3`,
      icon: <Heading3Icon />,
      active: isNodeActive(schema.nodes.heading, { level: 3 }),
      attrs: { level: 3 },
      visible: canFormatBlock,
    },
    {
      name: "blockquote",
      tooltip: t("Quote"),
      shortcut: `${metaDisplay}+]`,
      icon: <BlockQuoteIcon />,
      active: isNodeActive(schema.nodes.blockquote),
      attrs: { level: 2 },
      visible: !isInCodeBlock && !isTableCell && (!isMobile || isEmpty),
    },
    {
      name: "separator",
    },
    {
      name: "mergeCells",
      tooltip: t("Merge cells"),
      icon: <TableMergeCellsIcon />,
      visible: isMultipleCellSelection(state),
    },
    {
      name: "splitCell",
      tooltip: t("Split cell"),
      icon: <TableSplitCellsIcon />,
      visible: isMergedCellSelection(state),
    },
    {
      name: "container_toggle",
      icon: <CollapseIcon />,
      tooltip: t("Toggle block"),
      active: isNodeActive(schema.nodes.container_toggle),
      attrs: { id: uuidv4() },
      visible: canFormatBlock,
    },
    {
      name: "separator",
    },
    {
      name: "checkbox_list",
      tooltip: t("Todo list"),
      shortcut: `⇧+Ctrl+7`,
      icon: <TodoListIcon />,
      keywords: "checklist checkbox task",
      active: isListActive(schema.nodes.checkbox_list),
      visible: !isInCodeBlock && !isTableCell && (!isList || !isTouch),
    },
    {
      name: "bullet_list",
      tooltip: t("Bulleted list"),
      shortcut: `⇧+Ctrl+8`,
      icon: <BulletedListIcon />,
      active: isListActive(schema.nodes.bullet_list),
      visible: !isInCodeBlock && !isTableCell && (!isList || !isTouch),
    },
    {
      name: "ordered_list",
      tooltip: t("Ordered list"),
      shortcut: `⇧+Ctrl+9`,
      icon: <OrderedListIcon />,
      active: isListActive(schema.nodes.ordered_list),
      visible: !isInCodeBlock && !isTableCell && (!isList || !isTouch),
    },
    {
      name: "outdentList",
      tooltip: t("Outdent"),
      shortcut: `⇧+Tab`,
      icon: <OutdentIcon />,
      visible:
        (isTouch || isMobile) &&
        isInList(state, { types: ["ordered_list", "bullet_list"] }),
    },
    {
      name: "indentList",
      tooltip: t("Indent"),
      shortcut: `Tab`,
      icon: <IndentIcon />,
      visible:
        (isTouch || isMobile) &&
        isInList(state, { types: ["ordered_list", "bullet_list"] }),
    },
    {
      name: "outdentCheckboxList",
      tooltip: t("Outdent"),
      shortcut: `⇧+Tab`,
      icon: <OutdentIcon />,
      visible:
        (isTouch || isMobile) && isInList(state, { types: ["checkbox_list"] }),
    },
    {
      name: "indentCheckboxList",
      tooltip: t("Indent"),
      shortcut: `Tab`,
      icon: <IndentIcon />,
      visible:
        (isTouch || isMobile) && isInList(state, { types: ["checkbox_list"] }),
    },
    {
      name: "separator",
      visible: !isInCodeBlock,
    },
    {
      name: "addLink",
      tooltip: t("Create link"),
      shortcut: `${metaDisplay}+K`,
      icon: <LinkIcon />,
      attrs: { href: "" },
      active: isMarkActive(schema.marks.link, undefined, { exact: true }),
      visible: canFormatInline,
    },
    {
      name: "comment",
      tooltip: t("Comment"),
      shortcut: `${metaDisplay}+⌥+M`,
      icon: <CommentIcon />,
      label: isInCodeBlock ? t("Comment") : undefined,
      active: isMarkActive(
        schema.marks.comment,
        { resolved: false },
        { exact: true }
      ),
      visible: !isMobile || !isEmpty,
    },
    {
      name: "separator",
      visible: isInCode && !isInCodeBlock && (!isMobile || !isEmpty),
    },
    {
      name: "copyToClipboard",
      icon: <CopyIcon />,
      tooltip: t("Copy"),
      shortcut: `${metaDisplay}+C`,
      visible: isInCode && !isInCodeBlock && (!isMobile || !isEmpty),
    },
  ];
}
