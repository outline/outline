import { t } from "i18next";
import { CommentIcon } from "outline-icons";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import type { MenuItem, SelectionContext } from "@shared/editor/types";

/**
 * Returns menu items for the read-only selection toolbar.
 *
 * @param ctx - the current selection context.
 * @param canUpdate - whether the user has permission to update the document.
 * @returns an array of menu items.
 */
export default function readOnlyMenuItems(
  ctx: SelectionContext,
  canUpdate: boolean
): MenuItem[] {
  const { schema } = ctx;

  return [
    {
      visible: canUpdate && !ctx.isEmpty,
      name: "comment",
      tooltip: t("Comment"),
      label: t("Comment"),
      icon: <CommentIcon />,
      active: isMarkActive(schema.marks.comment),
    },
  ];
}
