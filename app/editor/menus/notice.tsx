import { t } from "i18next";
import {
  DoneIcon,
  ExpandedIcon,
  InfoIcon,
  StarredIcon,
  WarningIcon,
} from "outline-icons";
import { NoticeTypes } from "@shared/editor/nodes/Notice";
import type { MenuItem, SelectionContext } from "@shared/editor/types";

/**
 * Returns menu items for the notice/callout selection toolbar.
 *
 * @param ctx - the current selection context.
 * @returns an array of menu items.
 */
export default function noticeMenuItems(ctx: SelectionContext): MenuItem[] {
  const node = ctx.selection.$from.node(-1);
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
      visible: !ctx.readOnly,
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
