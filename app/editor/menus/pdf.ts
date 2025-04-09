import { EditorState } from "prosemirror-state";

export default function getPdfMenuItems(state: EditorState, dictionary: any) {
  return [
    {
      name: "downloadPdfAttachment",
      title: dictionary.download,
      icon: "DownloadIcon",
    },
    {
      name: "replacePdfAttachment",
      title: dictionary.replace,
      icon: "ReplaceIcon",
    },
    {
      name: "deletePdfAttachment",
      title: dictionary.delete,
      icon: "TrashIcon",
      dangerous: true,
    },
  ];
}
