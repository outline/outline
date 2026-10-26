import { t } from "i18next";
import { ExpandedIcon } from "outline-icons";
import { NoticeTypes } from "@shared/editor/nodes/Notice";
import { findParentNode } from "@shared/editor/queries/findParentNode";
import type { MenuItem, SelectionContext } from "@shared/editor/types";
import { NoticeIcon } from "~/editor/components/NoticeIcon";

/**
 * Returns menu items for the notice/callout selection toolbar.
 *
 * @param ctx - the current selection context.
 * @returns an array of menu items.
 */
export default function noticeMenuItems(ctx: SelectionContext): MenuItem[] {
  const notice = findParentNode(
    (node) => node.type === ctx.schema.nodes.container_notice
  )(ctx.selection);
  const currentStyle: NoticeTypes =
    notice?.node.attrs.style ?? NoticeTypes.Info;

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
          icon: <NoticeIcon type={NoticeTypes.Info} />,
          label: t("Info notice"),
          active: () => currentStyle === NoticeTypes.Info,
        },
        {
          name: NoticeTypes.Success,
          icon: <NoticeIcon type={NoticeTypes.Success} />,
          label: t("Success notice"),
          active: () => currentStyle === NoticeTypes.Success,
        },
        {
          name: NoticeTypes.Warning,
          icon: <NoticeIcon type={NoticeTypes.Warning} />,
          label: t("Warning notice"),
          active: () => currentStyle === NoticeTypes.Warning,
        },
        {
          name: NoticeTypes.Tip,
          icon: <NoticeIcon type={NoticeTypes.Tip} />,
          label: t("Tip notice"),
          active: () => currentStyle === NoticeTypes.Tip,
        },
      ],
    },
  ];
}
