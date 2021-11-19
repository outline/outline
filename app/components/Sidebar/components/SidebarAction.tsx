import invariant from "invariant";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { actionToMenuItem } from "~/actions";
import useStores from "~/hooks/useStores";
import { Action } from "~/types";
import SidebarLink from "./SidebarLink";

type Props = {
  action: Action;
  depth?: number;
};

function SidebarAction({ action, ...rest }: Props) {
  const stores = useStores();
  const { t } = useTranslation();
  const location = useLocation();
  const context = {
    isContextMenu: false,
    isCommandBar: false,
    activeCollectionId: undefined,
    activeDocumentId: undefined,
    location,
    stores,
    t,
  };
  const menuItem = actionToMenuItem(action, context);
  invariant(menuItem.type === "button", "passed action must be a button");

  return (
    <SidebarLink
      onClick={menuItem.onClick}
      icon={menuItem.icon}
      label={menuItem.title}
      {...rest}
    />
  );
}

export default observer(SidebarAction);
