import type { TFunction } from "i18next";
import { CommentIcon } from "outline-icons";
import type { EditorState } from "prosemirror-state";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import type { MenuItem } from "@shared/editor/types";

export default function readOnlyMenuItems(
  state: EditorState,
  canUpdate: boolean,
  t: TFunction
): MenuItem[] {
  const { schema } = state;
  const isEmpty = state.selection.empty;

  return [
    {
      visible: canUpdate && !isEmpty,
      name: "comment",
      tooltip: t("Comment"),
      label: t("Comment"),
      icon: <CommentIcon />,
      active: isMarkActive(schema.marks.comment),
    },
  ];
}
