import {
  TrashIcon,
  DownloadIcon,
  ReplaceIcon,
  AlignImageLeftIcon,
  AlignImageRightIcon,
  AlignImageCenterIcon,
  AlignFullWidthIcon,
} from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import isNodeActive from "@shared/editor/queries/isNodeActive";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function imageMenuItems(
  state: EditorState,
  dictionary: Dictionary
): MenuItem[] {
  const { schema } = state;
  const isLeftAligned = isNodeActive(schema.nodes.image, {
    layoutClass: "left-50",
  });
  const isRightAligned = isNodeActive(schema.nodes.image, {
    layoutClass: "right-50",
  });
  const isFullWidthAligned = isNodeActive(schema.nodes.image, {
    layoutClass: "full-width",
  });

  return [
    {
      name: "alignLeft",
      tooltip: dictionary.alignLeft,
      icon: <AlignImageLeftIcon />,
      visible: true,
      active: isLeftAligned,
    },
    {
      name: "alignCenter",
      tooltip: dictionary.alignCenter,
      icon: <AlignImageCenterIcon />,
      visible: true,
      active: (state) =>
        isNodeActive(schema.nodes.image)(state) &&
        !isLeftAligned(state) &&
        !isRightAligned(state) &&
        !isFullWidthAligned(state),
    },
    {
      name: "alignRight",
      tooltip: dictionary.alignRight,
      icon: <AlignImageRightIcon />,
      visible: true,
      active: isRightAligned,
    },
    {
      name: "alignFullWidth",
      tooltip: dictionary.alignFullWidth,
      icon: <AlignFullWidthIcon />,
      visible: true,
      active: isFullWidthAligned,
    },
    {
      name: "separator",
      visible: true,
    },
    {
      name: "downloadImage",
      tooltip: dictionary.downloadImage,
      icon: <DownloadIcon />,
      visible: !!fetch,
    },
    {
      name: "replaceImage",
      tooltip: dictionary.replaceImage,
      icon: <ReplaceIcon />,
      visible: true,
    },
    {
      name: "deleteImage",
      tooltip: dictionary.deleteImage,
      icon: <TrashIcon />,
      visible: true,
    },
  ];
}
