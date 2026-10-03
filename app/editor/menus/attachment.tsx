import { t } from "i18next";
import { TrashIcon, DownloadIcon, ReplaceIcon } from "outline-icons";
import { NodeSelection } from "prosemirror-state";
import { getAttachmentPreview } from "@shared/editor/lib/attachmentPreview";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
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

  // the preview provider for the selected attachment, if it supports one
  const { selection } = state;
  const preview =
    selection instanceof NodeSelection &&
    selection.node.type === schema.nodes.attachment
      ? getAttachmentPreview(selection.node)
      : undefined;

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
      tooltip: preview ? preview.label() : t("Show preview"),
      icon: preview?.icon,
      active: isAttachmentWithPreview,
      visible: !!preview,
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
