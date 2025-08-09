import invariant from "invariant";
import { observer } from "mobx-react";
import { actionV2ToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import { ActionV2Variant, ActionV2WithChildren } from "~/types";
import SidebarLink from "./SidebarLink";

type Props = {
  action: Exclude<ActionV2Variant, ActionV2WithChildren>;
  depth?: number;
};

function SidebarAction({ action, ...rest }: Props) {
  const context = useActionContext({
    isMenu: false,
    isCommandBar: false,
    activeCollectionId: undefined,
    activeDocumentId: undefined,
  });
  const menuItem = actionV2ToMenuItem(action, context);
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
