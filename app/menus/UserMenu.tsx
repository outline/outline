import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import User from "~/models/User";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  user: User;
};

function UserMenu({ user }: Props) {
  const { users } = useStores();
  const { t } = useTranslation();
  const menu = useMenuState({
    modal: true,
  });
  const can = usePolicy(user.id);
  const { showToast } = useToasts();

  const handlePromote = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      if (
        !window.confirm(
          t(
            "Are you sure you want to make {{ userName }} an admin? Admins can modify team and billing information.",
            {
              userName: user.name,
            }
          )
        )
      ) {
        return;
      }

      users.promote(user);
    },
    [users, user, t]
  );

  const handleMember = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      if (
        !window.confirm(
          t("Are you sure you want to make {{ userName }} a member?", {
            userName: user.name,
          })
        )
      ) {
        return;
      }

      users.demote(user, "member");
    },
    [users, user, t]
  );

  const handleViewer = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      if (
        !window.confirm(
          t(
            "Are you sure you want to make {{ userName }} a read-only viewer? They will not be able to edit any content",
            {
              userName: user.name,
            }
          )
        )
      ) {
        return;
      }

      users.demote(user, "viewer");
    },
    [users, user, t]
  );

  const handleSuspend = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      if (
        !window.confirm(
          t(
            "Are you sure you want to suspend this account? Suspended users will be prevented from logging in."
          )
        )
      ) {
        return;
      }

      users.suspend(user);
    },
    [users, user, t]
  );

  const handleRevoke = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      users.delete(user, {
        confirmation: true,
      });
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
        showToast(t(`An error occurred while sending the invite`), {
          type: "error",
        });
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
              title: t("Make {{ userName }} a member", {
                userName: user.name,
              }),
              onClick: handleMember,
              visible: can.demote && user.role !== "member",
            },
            {
              type: "button",
              title: t("Make {{ userName }} a viewer", {
                userName: user.name,
              }),
              onClick: handleViewer,
              visible: can.demote && user.role !== "viewer",
            },
            {
              type: "button",
              title: t("Make {{ userName }} an admin…", {
                userName: user.name,
              }),
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
