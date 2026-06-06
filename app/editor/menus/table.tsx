import {
  AlignFullWidthIcon,
  DownloadIcon,
  TableColumnsDistributeIcon,
  TrashIcon,
} from "outline-icons";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import { t } from "i18next";
import type { MenuItem, SelectionContext } from "@shared/editor/types";
import { TableLayout } from "@shared/editor/types";

/**
 * Returns menu items for the table selection toolbar (full table selected).
 *
 * @param ctx - the current selection context.
 * @returns an array of menu items.
 */
export default function tableMenuItems(ctx: SelectionContext): MenuItem[] {
  if (ctx.readOnly) {
    return [];
  }
  const { schema, state } = ctx;

  const isFullWidth = isNodeActive(schema.nodes.table, {
    layout: TableLayout.fullWidth,
  })(state);

  return [
    {
      name: "setTableAttr",
      label: isFullWidth ? t("Default width") : t("Full width"),
      icon: <AlignFullWidthIcon />,
      attrs: isFullWidth ? { layout: null } : { layout: TableLayout.fullWidth },
    },
    {
      name: "distributeColumns",
      label: t("Distribute columns"),
      icon: <TableColumnsDistributeIcon />,
    },
    {
      name: "separator",
    },
    {
      name: "exportTable",
      label: t("Export as CSV"),
      attrs: { format: "csv", fileName: `${window.document.title}.csv` },
      icon: <DownloadIcon />,
    },
    {
      name: "separator",
    },
    {
      name: "deleteTable",
      label: t("Delete table"),
      dangerous: true,
      icon: <TrashIcon />,
    },
  ];
}
