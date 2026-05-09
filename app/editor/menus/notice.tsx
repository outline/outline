import type { TFunction } from "i18next";
import {
  DoneIcon,
  ExpandedIcon,
  InfoIcon,
  StarredIcon,
  WarningIcon,
} from "outline-icons";
import type { EditorState } from "prosemirror-state";
import { NoticeTypes } from "@shared/editor/nodes/Notice";
import type { MenuItem } from "@shared/editor/types";

export default function noticeMenuItems(
  state: EditorState,
  readOnly: boolean | undefined,
  t: TFunction
): MenuItem[] {
  const node = state.selection.$from.node(-1);
  const currentStyle = node?.attrs.style as NoticeTypes;

  const mapping = {
    [NoticeTypes.Info]: t("Info notice"),
    [NoticeTypes.Warning]: t("Warning notice"),
    [NoticeTypes.Success]: t("Success notice"),
    [NoticeTypes.Tip]: t("Tip notice"),
  };

  return [
    {
      name: "container_notice",
      visible: !readOnly,
      label: mapping[currentStyle],
      icon: <ExpandedIcon />,
      children: [
        {
          name: NoticeTypes.Info,
          icon: <InfoIcon />,
          label: t("Info notice"),
          active: () => currentStyle === NoticeTypes.Info,
        },
        {
          name: NoticeTypes.Success,
          icon: <DoneIcon />,
          label: t("Success notice"),
          active: () => currentStyle === NoticeTypes.Success,
        },
        {
          name: NoticeTypes.Warning,
          icon: <WarningIcon />,
          label: t("Warning notice"),
          active: () => currentStyle === NoticeTypes.Warning,
        },
        {
          name: NoticeTypes.Tip,
          icon: <StarredIcon />,
          label: t("Tip notice"),
          active: () => currentStyle === NoticeTypes.Tip,
        },
      ],
    },
  ];
}
