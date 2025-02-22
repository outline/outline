import {
  DoneIcon,
  ExpandedIcon,
  InfoIcon,
  StarredIcon,
  WarningIcon,
} from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import { NoticeTypes } from "@shared/editor/nodes/Notice";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function noticeMenuItems(
  state: EditorState,
  readOnly: boolean | undefined,
  dictionary: Dictionary
): MenuItem[] {
  const { selection } = state;
  const { $from } = selection;
  const node = $from.node(-1);

  const currentStyle = node.attrs.style;

  const canView = (type: NoticeTypes) => {
    if (readOnly) {
      return false;
    }

    return currentStyle !== type;
  };

  return [
    {
      name: "container_notice",
      visible: !readOnly,
      label: "Type",
      icon: <ExpandedIcon />,
      children: [
        {
          name: NoticeTypes.Info,
          icon: <InfoIcon />,
          label: dictionary.infoNotice,
          visible: canView(NoticeTypes.Info),
        },
        {
          name: NoticeTypes.Success,
          icon: <DoneIcon />,
          label: dictionary.successNotice,
          visible: canView(NoticeTypes.Success),
        },
        {
          name: NoticeTypes.Warning,
          icon: <WarningIcon />,
          label: dictionary.warningNotice,
          visible: canView(NoticeTypes.Warning),
        },
        {
          name: NoticeTypes.Tip,
          icon: <StarredIcon />,
          label: dictionary.tipNotice,
          visible: canView(NoticeTypes.Tip),
        },
      ],
    },
  ];
}
