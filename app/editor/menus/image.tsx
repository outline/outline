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
} from "outline-icons";
import { EditorState } from "prosemirror-state";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";
import { metaDisplay } from "@shared/utils/keyboard";
import { ImageSource } from "@shared/editor/lib/FileHelper";
import Desktop from "~/utils/Desktop";

export default function imageMenuItems(
  state: EditorState,
  readOnly: boolean,
  dictionary: Dictionary
): MenuItem[] {
  if (readOnly) {
    return [];
  }
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
      tooltip: dictionary.alignLeft,
      icon: <AlignImageLeftIcon />,
      active: isLeftAligned,
      visible: !isEmptyDiagram(state),
    },
    {
      name: "alignCenter",
      tooltip: dictionary.alignCenter,
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
      tooltip: dictionary.alignRight,
      icon: <AlignImageRightIcon />,
      active: isRightAligned,
      visible: !isEmptyDiagram(state),
    },
    {
      name: "alignFullWidth",
      tooltip: dictionary.alignFullWidth,
      icon: <AlignFullWidthIcon />,
      active: isFullWidthAligned,
      visible: !isEmptyDiagram(state),
    },
    {
      name: "separator",
    },
    {
      name: "dimensions",
      tooltip: dictionary.dimensions,
      visible: !isFullWidthAligned(state) && !isEmptyDiagram(state),
      skipIcon: true,
    },
    {
      name: "separator",
    },
    {
      name: "editDiagram",
      tooltip: "Edit diagram",
      icon: <EditIcon />,
      visible: isDiagram(state) && !Desktop.isElectron(),
    },
    {
      name: "downloadImage",
      tooltip: dictionary.downloadImage,
      icon: <DownloadIcon />,
      visible: !!fetch && !isEmptyDiagram(state),
    },
    {
      tooltip: dictionary.replaceImage,
      icon: <ReplaceIcon />,
      visible: !isDiagram(state),
      children: [
        {
          name: "replaceImage",
          label: dictionary.uploadImage,
        },
        {
          name: "editImageUrl",
          label: dictionary.editImageUrl,
        },
      ],
    },
    {
      name: "deleteImage",
      tooltip: dictionary.deleteImage,
      icon: <TrashIcon />,
    },
    {
      name: "separator",
    },
    {
      name: "commentOnImage",
      tooltip: dictionary.comment,
      shortcut: `${metaDisplay}+⌥+M`,
      icon: <CommentIcon />,
    },
  ];
}
