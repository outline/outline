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
} from "outline-icons";
import CellBackgroundColorPicker from "../components/CellBackgroundColorPicker";
import type { EditorState } from "prosemirror-state";
import styled from "styled-components";
import Highlight from "@shared/editor/marks/Highlight";
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
  hasNodeAttrMarkCellSelection,
  hasNodeAttrMarkWithAttrsCellSelection,
  isMergedCellSelection,
  isMultipleCellSelection,
} from "@shared/editor/queries/table";
import { CellSelection } from "prosemirror-tables";

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

  const cellHasBackground = isTableCell
    ? hasNodeAttrMarkCellSelection(
        state.selection as CellSelection,
        "background"
      )
    : false;

  // Check if there's a custom color (not in predefined colors)
  const colors = getColorSetForSelectedCells(state.selection);
  const customColor =
    colors.size === 1
      ? [...colors].find((c) => !Highlight.lightColors.includes(c))
      : undefined;
  const hasMultipleColors = colors.size > 1;

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
      children: [
        ...[
          {
            name: "toggleCellBackgroundAndCollapseSelection",
            label: dictionary.none,
            icon: <DottedCircleIcon retainColor color="transparent" />,
            active: () => (cellHasBackground ? false : true),
            attrs: { color: null },
          },
        ],
        ...Highlight.lightColors.map((color, index) => ({
          name: "toggleCellBackgroundAndCollapseSelection",
          label: Highlight.colorNames[index],
          icon: <CircleIcon retainColor color={color} />,
          active: () =>
            !hasMultipleColors &&
            hasNodeAttrMarkWithAttrsCellSelection(
              state.selection as CellSelection,
              "background",
              { color }
            ),
          attrs: { color },
        })),
        ...(customColor
          ? [
              {
                name: "toggleCellBackgroundAndCollapseSelection",
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
                  command="toggleCellBackground"
                  activeColor={colors.size === 1 ? [...colors][0] : ""}
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
      tooltip: dictionary.mark,
      shortcut: `${metaDisplay}+⇧+H`,
      icon: highlight ? (
        <CircleIcon color={highlight.mark.attrs.color || Highlight.colors[0]} />
      ) : (
        <HighlightIcon />
      ),
      active: () => !!highlight,
      visible: !isCode && (!isMobile || !isEmpty) && !isTableCell,
      children: [
        ...(highlight
          ? [
              {
                name: "highlight",
                label: dictionary.none,
                icon: <DottedCircleIcon retainColor color="transparent" />,
                active: () => false,
                attrs: { color: null },
              },
            ]
          : []),
        ...Highlight.colors.map((color, index) => ({
          name: "highlight",
          label: Highlight.colorNames[index],
          icon: <CircleIcon retainColor color={color} />,
          active: isMarkActive(schema.marks.highlight, { color }),
          attrs: { color },
        })),
      ],
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

const DottedCircleIcon = styled(CircleIcon)`
  circle {
    stroke: ${(props) => props.theme.textSecondary};
    stroke-dasharray: 2, 2;
  }
`;
