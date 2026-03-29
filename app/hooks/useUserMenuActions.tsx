import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserRole } from "@shared/types";
import type User from "~/models/User";
import {
  ActionSeparator,
  createAction,
  createActionWithChildren,
} from "~/actions";
import {
  deleteUserActionFactory,
  updateUserRoleActionFactory,
} from "~/actions/definitions/users";
import { UserSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import {
  UserSuspendDialog,
  UserChangeNameDialog,
  UserChangeEmailDialog,
} from "~/components/UserDialogs";

/**
 * Hook that constructs the action menu for user management operations.
 * 
 * @param targetUser - the user to build actions for, or null to skip.
 * @returns action with children for use in menus, or undefined if user is null.
 */
export function useUserMenuActions(targetUser: User | null) {
  const { users, dialogs } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(targetUser ?? ({} as User));

  const openNameDialog = React.useCallback(() => {
    if (!targetUser) {
      return;
    }
    dialogs.openModal({
      title: t("Change name"),
      content: (
        <UserChangeNameDialog
          user={targetUser}
          onSubmit={dialogs.closeAllModals}
        />
      ),
    });
  }, [dialogs, t, targetUser]);

  const openEmailDialog = React.useCallback(() => {
    if (!targetUser) {
      return;
    }
    dialogs.openModal({
      title: t("Change email"),
      content: (
        <UserChangeEmailDialog
          user={targetUser}
          onSubmit={dialogs.closeAllModals}
        />
      ),
    });
  }, [dialogs, t, targetUser]);

  const openSuspendDialog = React.useCallback(() => {
    if (!targetUser) {
      return;
    }
    dialogs.openModal({
      title: t("Suspend user"),
      content: (
        <UserSuspendDialog
          user={targetUser}
          onSubmit={dialogs.closeAllModals}
        />
      ),
    });
  }, [dialogs, t, targetUser]);

  const revokeInvitation = React.useCallback(async () => {
    if (!targetUser) {
      return;
    }
    await users.delete(targetUser);
  }, [users, targetUser]);

  const resendInvitation = React.useCallback(async () => {
    if (!targetUser) {
      return;
    }
    try {
      await users.resendInvite(targetUser);
      toast.success(t(`Invite was resent to ${targetUser.name}`));
    } catch (err) {
      toast.error(
        err.message ?? t(`An error occurred while sending the invite`)
      );
    }
  }, [users, targetUser, t]);

  const activateUser = React.useCallback(async () => {
    if (!targetUser) {
      return;
    }
    await users.activate(targetUser);
  }, [users, targetUser]);

  const roleChangeActions = React.useMemo(
    () =>
      targetUser
        ? [UserRole.Admin, UserRole.Member, UserRole.Viewer].map((role) =>
            updateUserRoleActionFactory(targetUser, role)
          )
        : [],
    [targetUser]
  );

  const actionList = React.useMemo(
    () =>
      !targetUser
        ? []
        : [
            createActionWithChildren({
              name: t("Change role"),
              section: UserSection,
              visible: can.demote || can.promote,
              children: roleChangeActions,
            }),
            createAction({
              name: `${t("Change name")}…`,
              section: UserSection,
              visible: can.update,
              perform: openNameDialog,
            }),
            createAction({
              name: `${t("Change email")}…`,
              section: UserSection,
              visible: can.update,
              perform: openEmailDialog,
            }),
            createAction({
              name: t("Resend invite"),
              section: UserSection,
              visible: can.resendInvite,
              perform: resendInvitation,
            }),
            ActionSeparator,
            createAction({
              name: `${t("Revoke invite")}…`,
              section: UserSection,
              visible: targetUser.isInvited,
              dangerous: true,
              perform: revokeInvitation,
            }),
            createAction({
              name: t("Activate user"),
              section: UserSection,
              visible: !targetUser.isInvited && targetUser.isSuspended,
              perform: activateUser,
            }),
            createAction({
              name: `${t("Suspend user")}…`,
              section: UserSection,
              visible: !targetUser.isInvited && !targetUser.isSuspended,
              dangerous: true,
              perform: openSuspendDialog,
            }),
            ActionSeparator,
            deleteUserActionFactory(targetUser.id),
          ],
    [
      t,
      targetUser,
      can.demote,
      can.promote,
      can.update,
      can.resendInvite,
      roleChangeActions,
      openNameDialog,
      openEmailDialog,
      resendInvitation,
      revokeInvitation,
      activateUser,
      openSuspendDialog,
    ]
  );

  return useMenuAction(actionList);
}
