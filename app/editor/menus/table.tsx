import { AlignFullWidthIcon, TrashIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import isNodeActive from "@shared/editor/queries/isNodeActive";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function tableMenuItems(
  state: EditorState,
  dictionary: Dictionary
): MenuItem[] {
  const { schema } = state;
  const isFullWidth = isNodeActive(schema.nodes.table, {
    layout: "full-width",
  })(state);

  return [
    {
      name: "setTableAttr",
      tooltip: isFullWidth
        ? dictionary.alignDefaultWidth
        : dictionary.alignFullWidth,
      icon: <AlignFullWidthIcon />,
      attrs: isFullWidth ? { layout: null } : { layout: "full-width" },
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
  ];
}
