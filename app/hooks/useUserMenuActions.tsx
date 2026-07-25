import { useMemo } from "react";
import type User from "~/models/User";
import { ActionSeparator } from "~/actions";
import {
  activateUserActionFactory,
  changeUserAvatarActionFactory,
  changeUserEmailActionFactory,
  changeUserNameActionFactory,
  changeUserRoleActionFactory,
  deleteUserActionFactory,
  resendInviteActionFactory,
  revokeInviteActionFactory,
  suspendUserActionFactory,
} from "~/actions/definitions/users";
import { useMenuAction } from "~/hooks/useMenuAction";

/**
 * Hook that constructs the action menu for user management operations.
 *
 * @param targetUser - the user to build actions for, or null to skip.
 * @returns action with children for use in menus.
 */
export function useUserMenuActions(targetUser: User | null) {
  const actions = useMemo(
    () =>
      targetUser
        ? [
            changeUserRoleActionFactory(targetUser),
            changeUserAvatarActionFactory(targetUser),
            changeUserNameActionFactory(targetUser),
            changeUserEmailActionFactory(targetUser),
            resendInviteActionFactory(targetUser),
            ActionSeparator,
            revokeInviteActionFactory(targetUser),
            activateUserActionFactory(targetUser),
            suspendUserActionFactory(targetUser),
            ActionSeparator,
            deleteUserActionFactory(targetUser.id),
          ]
        : [],
    [targetUser]
  );

  return useMenuAction(actions);
}
