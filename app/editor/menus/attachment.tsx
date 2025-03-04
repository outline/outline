import { TrashIcon, DownloadIcon, ReplaceIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function attachmentMenuItems(
  state: EditorState,
  dictionary: Dictionary
): MenuItem[] {
  return [
    {
      name: "replaceAttachment",
      tooltip: dictionary.replaceAttachment,
      icon: <ReplaceIcon />,
    },
    {
      name: "deleteAttachment",
      tooltip: dictionary.deleteAttachment,
      icon: <TrashIcon />,
    },
    {
      name: "separator",
    },
    {
      name: "downloadAttachment",
      label: dictionary.download,
      icon: <DownloadIcon />,
      visible: !!fetch,
    },
  ];
}
