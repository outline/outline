import {
  AlignFullWidthIcon,
  DownloadIcon,
  TableColumnsDistributeIcon,
  TrashIcon,
} from "outline-icons";
import type { EditorState } from "prosemirror-state";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import type { MenuItem } from "@shared/editor/types";
import { TableLayout } from "@shared/editor/types";
import type { Dictionary } from "~/hooks/useDictionary";

export default function tableMenuItems(
  state: EditorState,
  readOnly: boolean,
  dictionary: Dictionary
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
      tooltip: isFullWidth
        ? dictionary.alignDefaultWidth
        : dictionary.alignFullWidth,
      icon: <AlignFullWidthIcon />,
      attrs: isFullWidth ? { layout: null } : { layout: TableLayout.fullWidth },
      active: () => isFullWidth,
    },
    {
      name: "distributeColumns",
      tooltip: dictionary.distributeColumns,
      icon: <TableColumnsDistributeIcon />,
    },
    {
      name: "separator",
    },
    {
      name: "deleteTable",
      tooltip: dictionary.deleteTable,
      icon: <TrashIcon />,
    },
    {
      name: "separator",
    },
    {
      name: "exportTable",
      tooltip: dictionary.exportAsCSV,
      label: "CSV",
      attrs: { format: "csv", fileName: `${window.document.title}.csv` },
      icon: <DownloadIcon />,
    },
  ];
}
