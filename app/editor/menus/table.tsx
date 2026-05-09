import {
  AlignFullWidthIcon,
  DownloadIcon,
  TableColumnsDistributeIcon,
  TrashIcon,
} from "outline-icons";
import type { EditorState } from "prosemirror-state";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import type { TFunction } from "i18next";
import type { MenuItem } from "@shared/editor/types";
import { TableLayout } from "@shared/editor/types";

export default function tableMenuItems(
  state: EditorState,
  readOnly: boolean,
  t: TFunction
): MenuItem[] {
  if (readOnly) {
    return [];
  }
  const { schema } = state;

  const isFullWidth = isNodeActive(schema.nodes.table, {
    layout: TableLayout.fullWidth,
  })(state);

  return [
    {
      name: "setTableAttr",
      tooltip: isFullWidth ? t("Default width") : t("Full width"),
      icon: <AlignFullWidthIcon />,
      attrs: isFullWidth ? { layout: null } : { layout: TableLayout.fullWidth },
      active: () => isFullWidth,
    },
    {
      name: "distributeColumns",
      tooltip: t("Distribute columns"),
      icon: <TableColumnsDistributeIcon />,
    },
    {
      name: "separator",
    },
    {
      name: "deleteTable",
      tooltip: t("Delete table"),
      icon: <TrashIcon />,
    },
    {
      name: "separator",
    },
    {
      name: "exportTable",
      tooltip: t("Export as CSV"),
      label: "CSV",
      attrs: { format: "csv", fileName: `${window.document.title}.csv` },
      icon: <DownloadIcon />,
    },
  ];
}
