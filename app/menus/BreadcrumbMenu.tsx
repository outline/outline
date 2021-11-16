import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import ContextMenu from "components/ContextMenu";
import OverflowMenuButton from "components/ContextMenu/OverflowMenuButton";
import Template from "components/ContextMenu/Template";

type MenuItem = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  to?: string;
};
type Props = {
  items: MenuItem[];
};

export default function BreadcrumbMenu({ items }: Props) {
  const { t } = useTranslation();
  const menu = useMenuState({
    modal: true,
    placement: "bottom",
  });
  return (
    <>
      <OverflowMenuButton aria-label={t("Show path to document")} {...menu} />
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element; "aria-label": string; b... Remove this comment to see the full error message
      <ContextMenu {...menu} aria-label={t("Path to document")}>
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'actions' is missing in type '{ items: Me... Remove this comment to see the full error message
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
}
