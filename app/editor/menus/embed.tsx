import { TrashIcon, EditIcon } from "outline-icons";
import type { MenuItem, SelectionContext } from "@shared/editor/types";
import { t } from "i18next";

/**
 * Returns menu items for the embed selection toolbar.
 *
 * @param ctx - the current selection context.
 * @returns an array of menu items.
 */
export default function embedMenuItems(ctx: SelectionContext): MenuItem[] {
  if (ctx.readOnly) {
    return [];
  }

  return [
    {
      name: "dimensions",
      tooltip: `${t("Width")} × ${t("Height")}`,
      visible: true,
      skipIcon: true,
    },
    {
      name: "separator",
    },
    {
      name: "editEmbedUrl",
      tooltip: t("Edit link"),
      icon: <EditIcon />,
    },
    {
      name: "deleteEmbed",
      tooltip: t("Delete embed"),
      icon: <TrashIcon />,
    },
  ];
}
