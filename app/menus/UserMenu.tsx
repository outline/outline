import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import { toast } from "sonner";
import { UserRole } from "@shared/types";
import User from "~/models/User";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import {
  UserSuspendDialog,
  UserChangeNameDialog,
  UserChangeEmailDialog,
} from "~/components/UserDialogs";
import { actionToMenuItem } from "~/actions";
import {
  deleteUserActionFactory,
  updateUserRoleActionFactory,
} from "~/actions/definitions/users";
import useActionContext from "~/hooks/useActionContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  user: User;
};

function UserMenu({ user }: Props) {
  const { users, dialogs } = useStores();
  const { t } = useTranslation();
  const menu = useMenuState({
    modal: true,
  });
  const can = usePolicy(user);
  const context = useActionContext({
    isContextMenu: true,
  });

  const handleChangeName = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      dialogs.openModal({
        title: t("Change name"),
        content: (
          <UserChangeNameDialog user={user} onSubmit={dialogs.closeAllModals} />
        ),
      });
    },
    [dialogs, t, user]
  );

  const handleChangeEmail = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      dialogs.openModal({
        title: t("Change email"),
        content: (
          <UserChangeEmailDialog
            user={user}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    [dialogs, t, user]
  );

  const handleSuspend = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      dialogs.openModal({
        title: t("Suspend user"),
        content: (
          <UserSuspendDialog user={user} onSubmit={dialogs.closeAllModals} />
        ),
      });
    },
    [dialogs, t, user]
  );

  const handleRevoke = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      await users.delete(user);
    },
    [users, user]
  );

  const handleResendInvite = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      try {
        await users.resendInvite(user);
        toast.success(t(`Invite was resent to ${user.name}`));
      } catch (err) {
        toast.error(
          err.message ?? t(`An error occurred while sending the invite`)
        );
      }
    },
    [users, user, t]
  );

  const handleActivate = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      await users.activate(user);
    },
    [users, user]
  );

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("User options")}>
        <Template
          {...menu}
          items={[
            {
              type: "submenu",
              title: t("Change role"),
              visible: can.demote || can.promote,
              items: [UserRole.Admin, UserRole.Member, UserRole.Viewer].map(
                (role) =>
                  actionToMenuItem(
                    updateUserRoleActionFactory(user, role),
                    context
                  )
              ),
            },
            {
              type: "button",
              title: `${t("Change name")}…`,
              onClick: handleChangeName,
              visible: can.update,
            },
            {
              type: "button",
              title: `${t("Change email")}…`,
              onClick: handleChangeEmail,
              visible: can.update,
            },
            {
              type: "button",
              title: t("Resend invite"),
              onClick: handleResendInvite,
              visible: can.resendInvite,
            },
            {
              type: "separator",
            },
            {
              type: "button",
              title: `${t("Revoke invite")}…`,
              dangerous: true,
              onClick: handleRevoke,
              visible: user.isInvited,
            },
            {
              type: "button",
              title: t("Activate user"),
              onClick: handleActivate,
              visible: !user.isInvited && user.isSuspended,
            },
            {
              type: "button",
              title: `${t("Suspend user")}…`,
              dangerous: true,
              onClick: handleSuspend,
              visible: !user.isInvited && !user.isSuspended,
            },
            {
              type: "separator",
            },
            actionToMenuItem(deleteUserActionFactory(user.id), context),
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(UserMenu);
