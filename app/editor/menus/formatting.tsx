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
import Highlight from "@shared/editor/marks/Highlight";
import { getMarksBetween } from "@shared/editor/queries/getMarksBetween";
import { isInCode } from "@shared/editor/queries/isInCode";
import { isInList } from "@shared/editor/queries/isInList";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import { MenuItem } from "@shared/editor/types";
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
      icon: <BoldIcon />,
      active: isMarkActive(schema.marks.strong),
      visible: !isCode && (!isMobile || !isEmpty),
    },
    {
      name: "em",
      tooltip: dictionary.em,
      icon: <ItalicIcon />,
      active: isMarkActive(schema.marks.em),
      visible: !isCode && (!isMobile || !isEmpty),
    },
    {
      name: "strikethrough",
      tooltip: dictionary.strikethrough,
      icon: <StrikethroughIcon />,
      active: isMarkActive(schema.marks.strikethrough),
      visible: !isCode && (!isMobile || !isEmpty),
    },
    {
      tooltip: dictionary.mark,
      icon: highlight ? (
        <CircleIcon color={highlight.mark.attrs.color} />
      ) : (
        <HighlightIcon />
      ),
      active: () => !!highlight,
      visible: !isCode && (!isMobile || !isEmpty),
      children: Highlight.colors.map((color, index) => ({
        name: "highlight",
        label: Highlight.colorNames[index],
        icon: <CircleIcon retainColor color={color} />,
        active: isMarkActive(schema.marks.highlight, { color }),
        attrs: { color },
      })),
    },
    {
      name: "code_inline",
      tooltip: dictionary.codeInline,
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
      icon: <Heading1Icon />,
      active: isNodeActive(schema.nodes.heading, { level: 1 }),
      attrs: { level: 1 },
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "heading",
      tooltip: dictionary.subheading,
      icon: <Heading2Icon />,
      active: isNodeActive(schema.nodes.heading, { level: 2 }),
      attrs: { level: 2 },
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "heading",
      tooltip: dictionary.subheading,
      icon: <Heading3Icon />,
      active: isNodeActive(schema.nodes.heading, { level: 3 }),
      attrs: { level: 3 },
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "blockquote",
      tooltip: dictionary.quote,
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
      icon: <TodoListIcon />,
      keywords: "checklist checkbox task",
      active: isNodeActive(schema.nodes.checkbox_list),
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "bullet_list",
      tooltip: dictionary.bulletList,
      icon: <BulletedListIcon />,
      active: isNodeActive(schema.nodes.bullet_list),
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "ordered_list",
      tooltip: dictionary.orderedList,
      icon: <OrderedListIcon />,
      active: isNodeActive(schema.nodes.ordered_list),
      visible: !isCodeBlock && (!isMobile || isEmpty),
    },
    {
      name: "outdentList",
      tooltip: dictionary.outdent,
      icon: <OutdentIcon />,
      visible:
        isMobile && isInList(state, { types: ["ordered_list", "bullet_list"] }),
    },
    {
      name: "indentList",
      tooltip: dictionary.indent,
      icon: <IndentIcon />,
      visible:
        isMobile && isInList(state, { types: ["ordered_list", "bullet_list"] }),
    },
    {
      name: "outdentCheckboxList",
      tooltip: dictionary.outdent,
      icon: <OutdentIcon />,
      visible: isMobile && isInList(state, { types: ["checkbox_list"] }),
    },
    {
      name: "indentCheckboxList",
      tooltip: dictionary.indent,
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
      icon: <LinkIcon />,
      active: isMarkActive(schema.marks.link),
      attrs: { href: "" },
      visible: !isCodeBlock && (!isMobile || !isEmpty),
    },
    {
      name: "comment",
      tooltip: dictionary.comment,
      icon: <CommentIcon />,
      label: isCodeBlock ? dictionary.comment : undefined,
      active: isMarkActive(schema.marks.comment, { resolved: false }),
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
      visible: isCode && !isCodeBlock && (!isMobile || !isEmpty),
    },
  ];
}
