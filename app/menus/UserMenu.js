// @flow
import { inject, observer } from "mobx-react";
import * as React from "react";

import { withTranslation, type TFunction } from "react-i18next";
import UsersStore from "stores/UsersStore";
import User from "models/User";
import { DropdownMenu } from "components/DropdownMenu";
import DropdownMenuItems from "components/DropdownMenu/DropdownMenuItems";

type Props = {
  user: User,
  users: UsersStore,
  t: TFunction,
};

@observer
class UserMenu extends React.Component<Props> {
  handlePromote = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { user, users, t } = this.props;
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
  };

  handleDemote = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { user, users, t } = this.props;
    if (
      !window.confirm(
        t("Are you sure you want to make {{ userName }} a member?", {
          userName: user.name,
        })
      )
    ) {
      return;
    }
    users.demote(user);
  };

  handleSuspend = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { user, users, t } = this.props;
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
  };

  handleRevoke = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { user, users } = this.props;
    users.delete(user, { confirmation: true });
  };

  handleActivate = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { user, users } = this.props;
    users.activate(user);
  };

  render() {
    const { user, t } = this.props;

    return (
      <DropdownMenu>
        <DropdownMenuItems
          items={[
            {
              title: t("Make {{ userName }} a member…", {
                userName: user.name,
              }),
              onClick: this.handleDemote,
              visible: user.isAdmin,
            },
            {
              title: t("Make {{ userName }} an admin…", {
                userName: user.name,
              }),
              onClick: this.handlePromote,
              visible: !user.isAdmin && !user.isSuspended,
            },
            {
              type: "separator",
            },
            {
              title: t("Revoke invite…"),
              onClick: this.handleRevoke,
              visible: user.isInvited,
            },
            {
              title: t("Activate account"),
              onClick: this.handleActivate,
              visible: !user.isInvited && user.isSuspended,
            },
            {
              title: t("Suspend account…"),
              onClick: this.handleSuspend,
              visible: !user.isInvited && !user.isSuspended,
            },
          ]}
        />
      </DropdownMenu>
    );
  }
}

export default withTranslation()<UserMenu>(inject("users")(UserMenu));
