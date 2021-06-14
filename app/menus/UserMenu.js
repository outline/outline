// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import User from "models/User";
import ContextMenu from "components/ContextMenu";
import OverflowMenuButton from "components/ContextMenu/OverflowMenuButton";
import Template from "components/ContextMenu/Template";
import useStores from "hooks/useStores";

type Props = {|
  user: User,
|};

function UserMenu({ user }: Props) {
  const { users, policies } = useStores();
  const { t } = useTranslation();
  const menu = useMenuState({ modal: true });
  const can = policies.abilities(user.id);

  const handlePromote = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      if (
        !window.confirm(
          t(
            "Are you sure you want to make {{ userName }} an admin? Admins can modify team and billing information.",
            { userName: user.name }
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
    (ev: SyntheticEvent<>) => {
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
      users.demote(user, "Member");
    },
    [users, user, t]
  );

  const handleViewer = React.useCallback(
    (ev: SyntheticEvent<>) => {
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
      users.demote(user, "Viewer");
    },
    [users, user, t]
  );

  const handleSuspend = React.useCallback(
    (ev: SyntheticEvent<>) => {
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
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      users.delete(user, { confirmation: true });
    },
    [users, user]
  );

  const handleActivate = React.useCallback(
    (ev: SyntheticEvent<>) => {
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
              title: t("Make {{ userName }} a member", {
                userName: user.name,
              }),
              onClick: handleMember,
              visible: can.demote && user.rank !== "Member",
            },
            {
              title: t("Make {{ userName }} a viewer", {
                userName: user.name,
              }),
              onClick: handleViewer,
              visible: can.demote && user.rank !== "Viewer",
            },
            {
              title: t("Make {{ userName }} an admin…", {
                userName: user.name,
              }),
              onClick: handlePromote,
              visible: can.promote && user.rank !== "Admin",
            },
            {
              type: "separator",
            },
            {
              title: `${t("Revoke invite")}…`,
              onClick: handleRevoke,
              visible: user.isInvited,
            },
            {
              title: t("Activate account"),
              onClick: handleActivate,
              visible: !user.isInvited && user.isSuspended,
            },
            {
              title: `${t("Suspend account")}…`,
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
