import invariant from "invariant";
import { observer } from "mobx-react";
import type * as React from "react";
import { actionToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import type { ActionVariant, ActionWithChildren } from "~/types";
import SidebarLink from "./SidebarLink";

type Props = {
  action: Exclude<ActionVariant, ActionWithChildren>;
  depth?: number;
  /** Optional actions to display on the right side of the link */
  menu?: React.ReactNode;
};

function SidebarAction({ action, ...rest }: Props) {
  const context = useActionContext({
    isMenu: false,
    isCommandBar: false,
    activeCollectionId: undefined,
    activeDocumentId: undefined,
  });
  const menuItem = actionToMenuItem(action, context);
  invariant(
    menuItem.type === "button" || menuItem.type === "route",
    "passed action must be a button or internal link"
  );

  if (!menuItem.visible) {
    return null;
  }

  return (
    <SidebarLink
      onClick={menuItem.type === "button" ? menuItem.onClick : undefined}
      to={menuItem.type === "route" ? menuItem.to : undefined}
      icon={menuItem.icon}
      label={menuItem.title}
      {...rest}
    />
  );
}

export default observer(SidebarAction);
