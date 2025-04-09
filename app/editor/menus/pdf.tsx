import { TrashIcon, DownloadIcon, ReplaceIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";

export default function getPdfMenuItems(state: EditorState, dictionary: any) {
  return [
    {
      name: "downloadPdfAttachment",
      tooltip: dictionary.download,
      icon: <DownloadIcon />,
    },
    {
      name: "replacePdfAttachment",
      tooltip: dictionary.replace,
      icon: <ReplaceIcon />,
    },
    {
      name: "deletePdfAttachment",
      tooltip: dictionary.delete,
      icon: <TrashIcon />,
      dangerous: true,
    },
  ];
}
