// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import ContextMenu from "components/ContextMenu";
import OverflowMenuButton from "components/ContextMenu/OverflowMenuButton";
import Template from "components/ContextMenu/Template";

type Props = {
  path: Array<any>,
};

export default function BreadcrumbMenu({ path }: Props) {
  const { t } = useTranslation();
  const menu = useMenuState({
    animated: 200,
    modal: true,
    placement: "bottom",
  });

  return (
    <>
      <OverflowMenuButton {...menu} />
      <ContextMenu {...menu} aria-label={t("Path to document")}>
        <Template
          {...menu}
          items={path.map((item) => ({
            title: item.title,
            to: item.url,
          }))}
        />
      </ContextMenu>
    </>
  );
}
