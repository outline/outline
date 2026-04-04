import {
  AlignFullWidthIcon,
  DownloadIcon,
  TableColumnsDistributeIcon,
  TrashIcon,
} from "outline-icons";
import type { EditorState } from "prosemirror-state";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import type { MenuItem } from "@shared/editor/types";
import { MenuType, TableLayout } from "@shared/editor/types";
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
      type: MenuType.inline,
      children: [
        {
          name: "setTableAttr",
          label: isFullWidth
            ? dictionary.alignDefaultWidth
            : dictionary.alignFullWidth,
          icon: <AlignFullWidthIcon />,
          attrs: isFullWidth
            ? { layout: null }
            : { layout: TableLayout.fullWidth },
        },
        {
          name: "distributeColumns",
          label: dictionary.distributeColumns,
          icon: <TableColumnsDistributeIcon />,
        },
        {
          name: "separator",
        },
        {
          name: "exportTable",
          label: dictionary.exportAsCSV,
          attrs: { format: "csv", fileName: `${window.document.title}.csv` },
          icon: <DownloadIcon />,
        },
        {
          name: "separator",
        },
        {
          name: "deleteTable",
          dangerous: true,
          label: dictionary.deleteTable,
          icon: <TrashIcon />,
        },
      ],
    },
  ];
}
