import { t } from "i18next";
import { TrashIcon, DownloadIcon, ReplaceIcon } from "outline-icons";
import { NodeSelection } from "prosemirror-state";
import type { MenuItem, SelectionContext } from "@shared/editor/types";

/**
 * Returns menu items for the video selection toolbar.
 *
 * @param ctx - the current selection context.
 * @returns an array of menu items.
 */
export default function videoMenuItems(ctx: SelectionContext): MenuItem[] {
  if (ctx.readOnly) {
    return [];
  }

  const { selection } = ctx.state;
  const hasWidth =
    selection instanceof NodeSelection && !!selection.node.attrs.width;

  return [
    {
      name: "dimensions",
      tooltip: `${t("Width")} × ${t("Height")}`,
      visible: hasWidth,
      skipIcon: true,
    },
    {
      name: "separator",
    },
    {
      name: "downloadVideo",
      tooltip: t("Download video"),
      icon: <DownloadIcon />,
    },
    {
      tooltip: t("Replace video"),
      icon: <ReplaceIcon />,
      children: [
        {
          name: "replaceVideo",
          label: t("Upload a video"),
        },
        {
          name: "editVideoUrl",
          label: t("Edit video URL"),
        },
      ],
    },
    {
      name: "deleteVideo",
      tooltip: t("Delete video"),
      icon: <TrashIcon />,
    },
  ];
}
