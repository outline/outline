import { TrashIcon, DownloadIcon, ReplaceIcon, EyeIcon } from "outline-icons";
import type { EditorState } from "prosemirror-state";
import type { MenuItem } from "@shared/editor/types";
import type { Dictionary } from "~/hooks/useDictionary";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";

export default function attachmentMenuItems(
  state: EditorState,
  readOnly: boolean,
  dictionary: Dictionary
): MenuItem[] {
  if (readOnly) {
    return [];
  }

  const { schema } = state;
  const isAttachmentWithPreview = isNodeActive(schema.nodes.attachment, {
    preview: true,
  });
  const isPdfAttachment = isNodeActive(schema.nodes.attachment, {
    contentType: "application/pdf",
  });

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
      name: "toggleAttachmentPreview",
      tooltip: dictionary.previewAttachment,
      icon: <EyeIcon />,
      active: isAttachmentWithPreview,
      visible: isPdfAttachment(state),
    },
    {
      name: "dimensions",
      tooltip: dictionary.dimensions,
      visible: isAttachmentWithPreview(state),
      skipIcon: true,
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
