import {
  DoneIcon,
  ExpandedIcon,
  InfoIcon,
  StarredIcon,
  WarningIcon,
} from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import { NOTICE_TYPES } from "@shared/editor/nodes/Notice";
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

  const canView = (type: NOTICE_TYPES) => {
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
          name: NOTICE_TYPES.INFO,
          icon: <InfoIcon />,
          label: dictionary.infoNotice,
          visible: canView(NOTICE_TYPES.INFO),
        },
        {
          name: NOTICE_TYPES.SUCCESS,
          icon: <DoneIcon />,
          label: dictionary.successNotice,
          visible: canView(NOTICE_TYPES.SUCCESS),
        },
        {
          name: NOTICE_TYPES.WARNING,
          icon: <WarningIcon />,
          label: dictionary.warningNotice,
          visible: canView(NOTICE_TYPES.WARNING),
        },
        {
          name: NOTICE_TYPES.TIP,
          icon: <StarredIcon />,
          label: dictionary.tipNotice,
          visible: canView(NOTICE_TYPES.TIP),
        },
      ],
    },
  ];
}
