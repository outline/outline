import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import User from "~/models/User";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import {
  UserChangeToAdminDialog,
  UserChangeToMemberDialog,
  UserChangeToViewerDialog,
  UserSuspendDialog,
} from "~/components/UserRoleDialogs";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

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
  const { showToast } = useToasts();

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

  const handleSuspend = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      dialogs.openModal({
        title: t("Suspend account"),
        isCentered: true,
        content: (
          <UserSuspendDialog user={user} onSubmit={dialogs.closeAllModals} />
        ),
      });
    },
    [dialogs, t, user]
  );

  const handleRevoke = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      users.delete(user);
    },
    [users, user]
  );

  const handleResendInvite = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      try {
        await users.resendInvite(user);
        showToast(t(`Invite was resent to ${user.name}`), { type: "success" });
      } catch (err) {
        showToast(
          err.message ?? t(`An error occurred while sending the invite`),
          {
            type: "error",
          }
        );
      }
    },
    [users, user, t, showToast]
  );

  const handleActivate = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      users.activate(user);
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
              title: `${t("Suspend account")}…`,
              dangerous: true,
              onClick: handleSuspend,
              visible: !user.isInvited && !user.isSuspended,
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(UserMenu);
