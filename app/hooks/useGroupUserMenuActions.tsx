import { useMemo } from "react";
import { ActionSeparator } from "~/actions";
import {
  changeGroupUserPermission,
  removeGroupUser,
} from "~/actions/definitions/groupUsers";
import { useMenuAction } from "~/hooks/useMenuAction";

/**
 * Hook that constructs the action menu for a member of a group. The group and
 * user are read from the active models in the action context.
 *
 * @returns action with children for use in menus.
 */
export function useGroupUserMenuActions() {
  const actions = useMemo(
    () => [changeGroupUserPermission, ActionSeparator, removeGroupUser],
    []
  );

  return useMenuAction(actions);
}
