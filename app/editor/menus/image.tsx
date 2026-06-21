import {
  TrashIcon,
  DownloadIcon,
  ReplaceIcon,
  AlignImageLeftIcon,
  AlignImageRightIcon,
  AlignImageCenterIcon,
  AlignFullWidthIcon,
  EditIcon,
  CommentIcon,
  LinkIcon,
} from "outline-icons";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import type { MenuItem, SelectionContext } from "@shared/editor/types";
import { metaDisplay } from "@shared/utils/keyboard";
import { ImageSource } from "@shared/editor/lib/FileHelper";
import Desktop from "~/utils/Desktop";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import { t } from "i18next";

/**
 * Returns menu items for the image selection toolbar.
 *
 * @param ctx - the current selection context.
 * @returns an array of menu items.
 */
export default function imageMenuItems(ctx: SelectionContext): MenuItem[] {
  if (ctx.readOnly) {
    return [];
  }
  const { schema, state } = ctx;
  const isLeftAligned = isNodeActive(schema.nodes.image, {
    layoutClass: "left-50",
  });
  const isRightAligned = isNodeActive(schema.nodes.image, {
    layoutClass: "right-50",
  });
  const isFullWidthAligned = isNodeActive(schema.nodes.image, {
    layoutClass: "full-width",
  });
  const isDiagram = isNodeActive(schema.nodes.image, {
    source: ImageSource.DiagramsNet,
  });
  const isEmptyDiagram = isNodeActive(schema.nodes.image, {
    source: ImageSource.DiagramsNet,
    src: "",
  });

  return [
    {
      name: "alignLeft",
      tooltip: t("Align left"),
      icon: <AlignImageLeftIcon />,
      active: isLeftAligned,
      visible: !isEmptyDiagram(state),
    },
    {
      name: "alignCenter",
      tooltip: t("Align center"),
      icon: <AlignImageCenterIcon />,
      active: (state) =>
        isNodeActive(schema.nodes.image)(state) &&
        !isLeftAligned(state) &&
        !isRightAligned(state) &&
        !isFullWidthAligned(state),
      visible: !isEmptyDiagram(state),
    },
    {
      name: "alignRight",
      tooltip: t("Align right"),
      icon: <AlignImageRightIcon />,
      active: isRightAligned,
      visible: !isEmptyDiagram(state),
    },
    {
      name: "alignFullWidth",
      tooltip: t("Full width"),
      icon: <AlignFullWidthIcon />,
      active: isFullWidthAligned,
      visible: !isEmptyDiagram(state),
    },
    {
      name: "separator",
    },
    {
      name: "dimensions",
      tooltip: `${t("Width")} × ${t("Height")}`,
      visible: !isFullWidthAligned(state) && !isEmptyDiagram(state),
      skipIcon: true,
    },
    {
      name: "separator",
    },
    {
      name: "editDiagram",
      tooltip: t("Edit diagram"),
      icon: <EditIcon />,
      visible: isDiagram(state) && !Desktop.isElectron(),
    },
    {
      name: "downloadImage",
      tooltip: t("Download image"),
      icon: <DownloadIcon />,
      visible: !!fetch && !isEmptyDiagram(state),
    },
    {
      tooltip: t("Replace image"),
      icon: <ReplaceIcon />,
      visible: !isDiagram(state),
      children: [
        {
          name: "replaceImage",
          label: t("Upload an image"),
        },
        {
          name: "editImageUrl",
          label: t("Edit image URL"),
        },
      ],
    },
    {
      name: "deleteImage",
      tooltip: t("Delete image"),
      icon: <TrashIcon />,
    },
    {
      name: "separator",
    },
    {
      name: "linkOnImage",
      tooltip: t("Create link"),
      shortcut: `${metaDisplay}+K`,
      active: isMarkActive(schema.marks.link),
      icon: <LinkIcon />,
    },
    {
      name: "commentOnImage",
      tooltip: t("Comment"),
      shortcut: `${metaDisplay}+⌥+M`,
      icon: <CommentIcon />,
    },
  ];
}
