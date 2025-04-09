import { TrashIcon, DownloadIcon, ReplaceIcon } from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";

export default function getPdfMenuItems(state: EditorState, dictionary: any) {
  return [
    {
      name: "replacePdfAttachment",
      tooltip: dictionary.replaceAttachment,
      icon: <ReplaceIcon />,
    },
    {
      name: "deletePdfAttachment",
      tooltip: dictionary.deleteAttachment,
      icon: <TrashIcon />,
      dangerous: true,
    },
    {
      name: "separator",
    },
    {
      name: "downloadPdfAttachment",
      label: dictionary.download,
      icon: <DownloadIcon />,
      visible: !!fetch,
    },
  ];
}
