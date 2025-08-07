import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserRole } from "@shared/types";
import User from "~/models/User";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import {
  UserSuspendDialog,
  UserChangeNameDialog,
  UserChangeEmailDialog,
} from "~/components/UserDialogs";
import {
  ActionV2Separator,
  createActionV2,
  createActionV2WithChildren,
} from "~/actions";
import {
  deleteUserActionFactory,
  updateUserRoleActionFactory,
} from "~/actions/definitions/users";
import { UserSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  user: User;
};

function UserMenu({ user }: Props) {
  const { users, dialogs } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(user);

  const handleChangeName = React.useCallback(() => {
    dialogs.openModal({
      title: t("Change name"),
      content: (
        <UserChangeNameDialog user={user} onSubmit={dialogs.closeAllModals} />
      ),
    });
  }, [dialogs, t, user]);

  const handleChangeEmail = React.useCallback(() => {
    dialogs.openModal({
      title: t("Change email"),
      content: (
        <UserChangeEmailDialog user={user} onSubmit={dialogs.closeAllModals} />
      ),
    });
  }, [dialogs, t, user]);

  const handleSuspend = React.useCallback(() => {
    dialogs.openModal({
      title: t("Suspend user"),
      content: (
        <UserSuspendDialog user={user} onSubmit={dialogs.closeAllModals} />
      ),
    });
  }, [dialogs, t, user]);

  const handleRevoke = React.useCallback(async () => {
    await users.delete(user);
  }, [users, user]);

  const handleResendInvite = React.useCallback(async () => {
    try {
      await users.resendInvite(user);
      toast.success(t(`Invite was resent to ${user.name}`));
    } catch (err) {
      toast.error(
        err.message ?? t(`An error occurred while sending the invite`)
      );
    }
  }, [users, user, t]);

  const handleActivate = React.useCallback(async () => {
    await users.activate(user);
  }, [users, user]);

  const changeRoleActions = React.useMemo(
    () =>
      [UserRole.Admin, UserRole.Member, UserRole.Viewer].map((role) =>
        updateUserRoleActionFactory(user, role)
      ),
    [user]
  );

  const actions = React.useMemo(
    () => [
      createActionV2WithChildren({
        name: t("Change role"),
        section: UserSection,
        visible: can.demote || can.promote,
        children: changeRoleActions,
      }),
      createActionV2({
        name: `${t("Change name")}…`,
        section: UserSection,
        visible: can.update,
        perform: handleChangeName,
      }),
      createActionV2({
        name: `${t("Change email")}…`,
        section: UserSection,
        visible: can.update,
        perform: handleChangeEmail,
      }),
      createActionV2({
        name: t("Resend invite"),
        section: UserSection,
        visible: can.resendInvite,
        perform: handleResendInvite,
      }),
      ActionV2Separator,
      createActionV2({
        name: `${t("Revoke invite")}…`,
        section: UserSection,
        visible: user.isInvited,
        dangerous: true,
        perform: handleRevoke,
      }),
      createActionV2({
        name: t("Activate user"),
        section: UserSection,
        visible: !user.isInvited && user.isSuspended,
        perform: handleActivate,
      }),
      createActionV2({
        name: `${t("Suspend user")}…`,
        section: UserSection,
        visible: !user.isInvited && !user.isSuspended,
        dangerous: true,
        perform: handleSuspend,
      }),
      ActionV2Separator,
      deleteUserActionFactory(user.id),
    ],
    [
      t,
      can.demote,
      can.promote,
      can.update,
      can.resendInvite,
      user.id,
      user.isInvited,
      user.isSuspended,
      changeRoleActions,
      handleChangeName,
      handleChangeEmail,
      handleResendInvite,
      handleRevoke,
      handleActivate,
      handleSuspend,
    ]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("User options")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(UserMenu);
