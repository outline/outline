import invariant from "invariant";
import { observer } from "mobx-react";
import { actionToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import { Action } from "~/types";
import SidebarLink from "./SidebarLink";

type Props = {
  action: Action;
  depth?: number;
};

function SidebarAction({ action, ...rest }: Props) {
  const context = useActionContext({
    isContextMenu: false,
    isCommandBar: false,
    activeCollectionId: undefined,
    activeDocumentId: undefined,
  });
  const menuItem = actionToMenuItem(action, context);
  invariant(menuItem.type === "button", "passed action must be a button");

  if (!menuItem.visible) {
    return null;
  }

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
