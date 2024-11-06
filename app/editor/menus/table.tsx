import { AlignFullWidthIcon, DownloadIcon, TrashIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import { MenuItem, TableLayout } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function tableMenuItems(
  state: EditorState,
  dictionary: Dictionary
): MenuItem[] {
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
