import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import { toast } from "sonner";
import User from "~/models/User";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import {
  UserChangeToAdminDialog,
  UserChangeToMemberDialog,
  UserChangeToViewerDialog,
  UserSuspendDialog,
  UserChangeNameDialog,
} from "~/components/UserDialogs";
import { actionToMenuItem } from "~/actions";
import { deleteUserActionFactory } from "~/actions/definitions/users";
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
  const can = usePolicy(user.id);
  const context = useActionContext({
    isContextMenu: true,
  });

  const handlePromote = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      dialogs.openModal({
        title: t("Change role to admin"),
        isCentered: true,
        content: (
          <UserChangeToAdminDialog
            user={user}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    [dialogs, t, user]
  );

  const handleMember = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      dialogs.openModal({
        title: t("Change role to member"),
        isCentered: true,
        content: (
          <UserChangeToMemberDialog
            user={user}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    [dialogs, t, user]
  );

  const handleViewer = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      dialogs.openModal({
        title: t("Change role to viewer"),
        isCentered: true,
        content: (
          <UserChangeToViewerDialog
            user={user}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    [dialogs, t, user]
  );

  const handleChangeName = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      dialogs.openModal({
        title: t("Change name"),
        isCentered: true,
        content: (
          <UserChangeNameDialog user={user} onSubmit={dialogs.closeAllModals} />
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
        isCentered: true,
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
              type: "button",
              title: `${t("Change role to member")}…`,
              onClick: handleMember,
              visible: can.demote && user.role !== "member",
            },
            {
              type: "button",
              title: `${t("Change role to viewer")}…`,
              onClick: handleViewer,
              visible: can.demote && user.role !== "viewer",
            },
            {
              type: "button",
              title: `${t("Change role to admin")}…`,
              onClick: handlePromote,
              visible: can.promote && user.role !== "admin",
            },
            {
              type: "button",
              title: `${t("Change name")}…`,
              onClick: handleChangeName,
              visible: can.update && user.role !== "admin",
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
              title: t("Activate account"),
              onClick: handleActivate,
              visible: !user.isInvited && user.isSuspended,
            },
            {
              type: "button",
              title: `${t("Suspend user")}…`,
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
