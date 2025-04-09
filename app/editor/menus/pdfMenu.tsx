import {
  TrashIcon as TrashIconBase,
  DownloadIcon as DownloadIconBase,
  ReplaceIcon as ReplaceIconBase,
} from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";

const TrashIcon = React.memo(TrashIconBase);
const DownloadIcon = React.memo(DownloadIconBase);
const ReplaceIcon = React.memo(ReplaceIconBase);

export default function getPdfMenuItems(state: EditorState, dictionary: any) {
  return [
    {
      name: "replacePdfAttachment",
      tooltip: dictionary.replaceAttachment ?? dictionary.replace,
      icon: <ReplaceIcon />,
    },
    {
      name: "deletePdfAttachment",
      tooltip: dictionary.deleteAttachment ?? dictionary.delete,
      icon: <TrashIcon />,
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
