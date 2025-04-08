import { DownloadIcon, ReplaceIcon, TrashIcon } from "outline-icons"; // Use TrashIcon
import { EditorState } from "prosemirror-state";
import * as React from "react"; // Import React for JSX
import { MenuItem } from "../../../shared/editor/types"; // Correct relative path
import { Dictionary } from "../../hooks/useDictionary"; // Correct relative path

export default function getPdfMenuItems(
  state: EditorState,
  dictionary: Dictionary
): MenuItem[] {
  const { schema } = state;

  // Check if the required commands exist in the schema/editor instance
  // This assumes the commands are registered correctly when the Pdf node is initialized
  const commands = state.schema.nodes.pdf_document?.spec.commands?.({
    type: schema.nodes.pdf_document,
    schema,
  });

  // Basic safety check, though commands should ideally always be present if the node exists
  if (
    !commands ||
    typeof commands !== "object" ||
    !("replacePdfAttachment" in commands) ||
    !("deletePdfAttachment" in commands) ||
    !("downloadPdfAttachment" in commands)
  ) {
    return [];
  }

  return [
    {
      name: "replacePdfAttachment",
      tooltip: dictionary.replaceAttachment, // Use correct dictionary key
      icon: <ReplaceIcon />,
      active: () => true, // Command should always be active when PDF is selected
    },
    {
      name: "downloadPdfAttachment",
      tooltip: dictionary.downloadAttachment, // Use correct dictionary key (assuming it exists, 'download' was present)
      icon: <DownloadIcon />,
      active: () => true,
    },
    {
      name: "separator",
    },
    {
      name: "deletePdfAttachment",
      tooltip: dictionary.deleteAttachment, // Use correct dictionary key
      icon: <TrashIcon />, // Use TrashIcon
      active: () => true,
      dangerous: true,
    },
  ];
}
