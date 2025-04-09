import { DownloadIcon, ReplaceIcon, TrashIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";

export default function getPdfMenuItems(state: EditorState, dictionary: any) {
  return [
    {
      name: "downloadPdfAttachment",
      title: dictionary.download,
      icon: <DownloadIcon />,
    },
    {
      name: "replacePdfAttachment",
      title: dictionary.replace,
      icon: <ReplaceIcon />,
    },
    {
      name: "deletePdfAttachment",
      title: dictionary.delete,
      icon: <TrashIcon />,
      dangerous: true,
    },
  ];
}
