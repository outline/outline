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
} from "outline-icons";
import { EditorState } from "prosemirror-state";
import { isInTable } from "prosemirror-tables";
import * as React from "react";
import isInCode from "@shared/editor/queries/isInCode";
import isInList from "@shared/editor/queries/isInList";
import isMarkActive from "@shared/editor/queries/isMarkActive";
import isNodeActive from "@shared/editor/queries/isNodeActive";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function formattingMenuItems(
  state: EditorState,
  isTemplate: boolean,
  isMobile: boolean,
  dictionary: Dictionary
): MenuItem[] {
  const { schema } = state;
  const isTable = isInTable(state);
  const isList = isInList(state);
  const isCode = isInCode(state);
  const isCodeBlock = isInCode(state, { onlyBlock: true });
  const allowBlocks = !isTable && !isList;

  return [
    {
      name: "placeholder",
      tooltip: dictionary.placeholder,
      icon: <InputIcon />,
      active: isMarkActive(schema.marks.placeholder),
      visible: isTemplate,
    },
    {
      name: "separator",
      visible: isTemplate,
    },
    {
      name: "strong",
      tooltip: dictionary.strong,
      icon: <BoldIcon />,
      active: isMarkActive(schema.marks.strong),
      visible: !isCode,
    },
    {
      name: "em",
      tooltip: dictionary.em,
      icon: <ItalicIcon />,
      active: isMarkActive(schema.marks.em),
      visible: !isCode,
    },
    {
      name: "strikethrough",
      tooltip: dictionary.strikethrough,
      icon: <StrikethroughIcon />,
      active: isMarkActive(schema.marks.strikethrough),
      visible: !isCode,
    },
    {
      name: "highlight",
      tooltip: dictionary.mark,
      icon: <HighlightIcon />,
      active: isMarkActive(schema.marks.highlight),
      visible: !isTemplate && !isCode,
    },
    {
      name: "code_inline",
      tooltip: dictionary.codeInline,
      icon: <CodeIcon />,
      active: isMarkActive(schema.marks.code_inline),
      visible: !isCodeBlock,
    },
    {
      name: "separator",
      visible: allowBlocks && !isCode,
    },
    {
      name: "heading",
      tooltip: dictionary.heading,
      icon: <Heading1Icon />,
      active: isNodeActive(schema.nodes.heading, { level: 1 }),
      attrs: { level: 1 },
      visible: allowBlocks && !isCode,
    },
    {
      name: "heading",
      tooltip: dictionary.subheading,
      icon: <Heading2Icon />,
      active: isNodeActive(schema.nodes.heading, { level: 2 }),
      attrs: { level: 2 },
      visible: allowBlocks && !isCode,
    },
    {
      name: "blockquote",
      tooltip: dictionary.quote,
      icon: <BlockQuoteIcon />,
      active: isNodeActive(schema.nodes.blockquote),
      attrs: { level: 2 },
      visible: allowBlocks && !isCode,
    },
    {
      name: "separator",
      visible: (allowBlocks || isList) && !isCode,
    },
    {
      name: "checkbox_list",
      tooltip: dictionary.checkboxList,
      icon: <TodoListIcon />,
      keywords: "checklist checkbox task",
      active: isNodeActive(schema.nodes.checkbox_list),
      visible: (allowBlocks || isList) && !isCode,
    },
    {
      name: "bullet_list",
      tooltip: dictionary.bulletList,
      icon: <BulletedListIcon />,
      active: isNodeActive(schema.nodes.bullet_list),
      visible: (allowBlocks || isList) && !isCode,
    },
    {
      name: "ordered_list",
      tooltip: dictionary.orderedList,
      icon: <OrderedListIcon />,
      active: isNodeActive(schema.nodes.ordered_list),
      visible: (allowBlocks || isList) && !isCode,
    },
    {
      name: "outdentList",
      tooltip: dictionary.outdent,
      icon: <OutdentIcon />,
      visible: isList && isMobile,
    },
    {
      name: "indentList",
      tooltip: dictionary.indent,
      icon: <IndentIcon />,
      visible: isList && isMobile,
    },
    {
      name: "separator",
      visible: !isCode,
    },
    {
      name: "link",
      tooltip: dictionary.createLink,
      icon: <LinkIcon />,
      active: isMarkActive(schema.marks.link),
      attrs: { href: "" },
      visible: !isCode,
    },
    {
      name: "comment",
      tooltip: dictionary.comment,
      icon: <CommentIcon />,
      label: isCodeBlock ? dictionary.comment : undefined,
      active: isMarkActive(schema.marks.comment),
    },
  ];
}
