import invariant from "invariant";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import SidebarLink from "./SidebarLink";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions' or its corresponding ... Remove this comment to see the full error message
import { actionToMenuItem } from "actions";
import useStores from "hooks/useStores";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { Action } from "types";

type Props ={
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
  invariant(menuItem.onClick, "passed action must have perform");

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
