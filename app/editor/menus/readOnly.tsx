import { CommentIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function readOnlyMenuItems(
  state: EditorState,
  canUpdate: boolean,
  dictionary: Dictionary
): MenuItem[] {
  const { schema } = state;
  const isEmpty = state.selection.empty;

  return [
    {
      visible: canUpdate && !isEmpty,
      name: "comment",
      tooltip: dictionary.comment,
      label: dictionary.comment,
      icon: <CommentIcon />,
      active: isMarkActive(schema.marks.comment),
    },
  ];
}
