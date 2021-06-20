// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import ContextMenu from "components/ContextMenu";
import OverflowMenuButton from "components/ContextMenu/OverflowMenuButton";
import Template from "components/ContextMenu/Template";

type MenuItem = {|
  icon?: React.Node,
  title: React.Node,
  to?: string,
|};

type Props = {
  items: MenuItem[],
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
      <ContextMenu {...menu} aria-label={t("Path to document")}>
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
}
