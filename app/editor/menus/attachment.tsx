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
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";
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
  const isLeftAligned = isNodeActive(schema.nodes.attachment, {
    layoutClass: "left-50",
  });
  const isRightAligned = isNodeActive(schema.nodes.attachment, {
    layoutClass: "right-50",
  });
  const isFullWidthAligned = isNodeActive(schema.nodes.attachment, {
    layoutClass: "full-width",
  });
  const isPreview = isNodeActive(schema.nodes.attachment, {
    preview: true,
  });

  return [
    {
      name: "alignLeft",
      tooltip: dictionary.alignLeft,
      icon: <AlignImageLeftIcon />,
      active: isLeftAligned,
      visible: isPreview(state),
    },
    {
      name: "alignCenter",
      tooltip: dictionary.alignCenter,
      icon: <AlignImageCenterIcon />,
      visible: isPreview(state),
      active: (state) =>
        isNodeActive(schema.nodes.attachment)(state) &&
        !isLeftAligned(state) &&
        !isRightAligned(state) &&
        !isFullWidthAligned(state),
    },
    {
      name: "alignRight",
      tooltip: dictionary.alignRight,
      icon: <AlignImageRightIcon />,
      active: isRightAligned,
      visible: isPreview(state),
    },
    {
      name: "alignFullWidth",
      tooltip: dictionary.alignFullWidth,
      icon: <AlignFullWidthIcon />,
      active: isFullWidthAligned,
      visible: isPreview(state),
    },
    {
      name: "separator",
    },
    {
      name: "dimensions",
      tooltip: dictionary.dimensions,
      visible: !isFullWidthAligned(state) && isPreview(state),
      skipIcon: true,
    },
    {
      name: "separator",
    },
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
      name: "downloadAttachment",
      label: dictionary.download,
      icon: <DownloadIcon />,
      visible: !!fetch,
    },
  ];
}
