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
} from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import styled from "styled-components";
import Highlight from "@shared/editor/marks/Highlight";
import { getMarksBetween } from "@shared/editor/queries/getMarksBetween";
import { isInCode } from "@shared/editor/queries/isInCode";
import { isInList } from "@shared/editor/queries/isInList";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import { MenuItem } from "@shared/editor/types";
import { metaDisplay } from "@shared/utils/keyboard";
import CircleIcon from "~/components/Icons/CircleIcon";
import { Dictionary } from "~/hooks/useDictionary";

export default function formattingMenuItems(
  state: EditorState,
  isTemplate: boolean,
  isMobile: boolean,
  dictionary: Dictionary
): MenuItem[] {
  const { schema } = state;
  const isCode = isInCode(state);
  const isCodeBlock = isInCode(state, { onlyBlock: true });
  const isEmpty = state.selection.empty;

  const highlight = getMarksBetween(
    state.selection.from,
    state.selection.to,
    state
  ).find(({ mark }) => mark.type.name === "highlight");

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
      tooltip: dictionary.mark,
      shortcut: `${metaDisplay}+Ctrl+H`,
      icon: highlight ? (
        <CircleIcon color={highlight.mark.attrs.color || Highlight.colors[0]} />
      ) : (
        <HighlightIcon />
      ),
      active: () => !!highlight,
      visible: !isCode && (!isMobile || !isEmpty),
      children: [
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
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "separator",
      visible: !isCodeBlock,
    },
    {
      name: "checkbox_list",
      tooltip: dictionary.checkboxList,
      shortcut: `⇧+Ctrl+7`,
      icon: <TodoListIcon />,
      keywords: "checklist checkbox task",
      active: isNodeActive(schema.nodes.checkbox_list),
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "bullet_list",
      tooltip: dictionary.bulletList,
      shortcut: `⇧+Ctrl+8`,
      icon: <BulletedListIcon />,
      active: isNodeActive(schema.nodes.bullet_list),
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "ordered_list",
      tooltip: dictionary.orderedList,
      shortcut: `⇧+Ctrl+9`,
      icon: <OrderedListIcon />,
      active: isNodeActive(schema.nodes.ordered_list),
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "outdentList",
      tooltip: dictionary.outdent,
      shortcut: `⇧+Tab`,
      icon: <OutdentIcon />,
      visible:
        isMobile && isInList(state, { types: ["ordered_list", "bullet_list"] }),
    },
    {
      name: "indentList",
      tooltip: dictionary.indent,
      shortcut: `Tab`,
      icon: <IndentIcon />,
      visible:
        isMobile && isInList(state, { types: ["ordered_list", "bullet_list"] }),
    },
    {
      name: "outdentCheckboxList",
      tooltip: dictionary.outdent,
      shortcut: `⇧+Tab`,
      icon: <OutdentIcon />,
      visible: isMobile && isInList(state, { types: ["checkbox_list"] }),
    },
    {
      name: "indentCheckboxList",
      tooltip: dictionary.indent,
      shortcut: `Tab`,
      icon: <IndentIcon />,
      visible: isMobile && isInList(state, { types: ["checkbox_list"] }),
    },
    {
      name: "separator",
      visible: !isCodeBlock,
    },
    {
      name: "link",
      tooltip: dictionary.createLink,
      shortcut: `${metaDisplay}+K`,
      icon: <LinkIcon />,
      attrs: { href: "" },
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
