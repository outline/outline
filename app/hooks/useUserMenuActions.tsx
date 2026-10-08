import { useMemo } from "react";
import { ActionSeparator } from "~/actions";
import {
  activateUser,
  changeUserAvatar,
  changeUserEmail,
  changeUserName,
  changeUserRole,
  deleteUser,
  resendInvite,
  revokeInvite,
  suspendUser,
} from "~/actions/definitions/users";
import { useMenuAction } from "~/hooks/useMenuAction";

/**
 * Hook that constructs the action menu for user management operations. The
 * user is read from the active models in the action context.
 *
 * @returns action with children for use in menus.
 */
export function useUserMenuActions() {
  const actions = useMemo(
    () => [
      changeUserRole,
      changeUserAvatar,
      changeUserName,
      changeUserEmail,
      resendInvite,
      ActionSeparator,
      revokeInvite,
      activateUser,
      suspendUser,
      ActionSeparator,
      deleteUser,
    ],
    []
  );

  return useMenuAction(actions);
}
