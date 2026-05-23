import type { TFunction } from "i18next";
import { PageBreakIcon, HorizontalRuleIcon } from "outline-icons";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import type { MenuItem, SelectionContext } from "@shared/editor/types";

/**
 * Returns menu items for the divider/page-break selection toolbar.
 *
 * @param ctx - the current selection context.
 * @param t - the i18next translation function.
 * @returns an array of menu items.
 */
export default function dividerMenuItems(
  ctx: SelectionContext,
  t: TFunction
): MenuItem[] {
  if (ctx.readOnly) {
    return [];
  }
  const { schema } = ctx;

  return [
    {
      name: "hr",
      tooltip: t("Divider"),
      attrs: { markup: "---" },
      active: isNodeActive(schema.nodes.hr, { markup: "---" }),
      icon: <HorizontalRuleIcon />,
    },
    {
      name: "hr",
      tooltip: t("Page break"),
      attrs: { markup: "***" },
      active: isNodeActive(schema.nodes.hr, { markup: "***" }),
      icon: <PageBreakIcon />,
    },
  ];
}
