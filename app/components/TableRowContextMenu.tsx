import * as React from "react";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import type { ActionWithChildren } from "~/types";
import type User from "~/models/User";
import { useUserMenuActions } from "~/hooks/useUserMenuActions";

type RowMenuConfig<T> =
  | { type: "user"; data: T extends User ? T : never }
  | { type: "custom"; buildAction: (item: T) => ActionWithChildren | undefined; data: T };

type TableRowContextMenuProps<T> = {
  config: RowMenuConfig<T>;
  menuLabel: string;
  children: React.ReactNode;
};

/**
 * Wraps table rows with right-click context menu functionality.
 * Supports different menu types through configuration.
 * 
 * @param config - configuration for menu type and data.
 * @param menuLabel - accessibility label for the context menu.
 * @param children - the table row element to wrap.
 */
export function TableRowContextMenu<T>({
  config,
  menuLabel,
  children,
}: TableRowContextMenuProps<T>) {
  const userMenuAction =
    useUserMenuActions(config.type === "user" ? (config.data as User) : null);
  
  const customMenuAction =
    config.type === "custom" ? config.buildAction(config.data) : undefined;

  const menuAction = config.type === "user" ? userMenuAction : customMenuAction;

  if (!menuAction) {
    return <>{children}</>;
  }

  return (
    <ContextMenu action={menuAction} ariaLabel={menuLabel}>
      {children}
    </ContextMenu>
  );
}

