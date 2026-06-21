import { t } from "i18next";
import { TrashIcon, DownloadIcon, ReplaceIcon, PDFIcon } from "outline-icons";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import { isPDFAttachmentActive } from "@shared/editor/queries/isPDFAttachment";
import type { MenuItem, SelectionContext } from "@shared/editor/types";

/**
 * Returns menu items for the attachment selection toolbar.
 *
 * @param ctx - the current selection context.
 * @returns an array of menu items.
 */
export default function attachmentMenuItems(ctx: SelectionContext): MenuItem[] {
  if (ctx.readOnly) {
    return [];
  }

  const { schema, state } = ctx;
  const isAttachmentWithPreview = isNodeActive(schema.nodes.attachment, {
    preview: true,
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
      visible: isPDFAttachmentActive(state),
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
