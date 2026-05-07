import type { TFunction } from "i18next";
import { TrashIcon, DownloadIcon, ReplaceIcon, PDFIcon } from "outline-icons";
import type { EditorState } from "prosemirror-state";
import type { MenuItem } from "@shared/editor/types";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";

export default function attachmentMenuItems(
  state: EditorState,
  readOnly: boolean,
  t: TFunction
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
      tooltip: t("Replace file"),
      icon: <ReplaceIcon />,
    },
    {
      name: "deleteAttachment",
      tooltip: t("Delete file"),
      icon: <TrashIcon />,
    },
    {
      name: "toggleAttachmentPreview",
      tooltip: t("Show preview"),
      icon: <PDFIcon />,
      active: isAttachmentWithPreview,
      visible: isPdfAttachment(state),
    },
    {
      name: "separator",
    },
    {
      name: "dimensions",
      tooltip: `${t("Width")} × ${t("Height")}`,
      visible: isAttachmentWithPreview(state),
      skipIcon: true,
    },
    {
      name: "separator",
    },
    {
      name: "downloadAttachment",
      label: t("Download"),
      icon: <DownloadIcon />,
      visible: !!fetch,
    },
  ];
}
