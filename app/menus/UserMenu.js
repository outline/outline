// @flow
import { inject, observer } from "mobx-react";
import * as React from "react";

import UsersStore from "stores/UsersStore";
import User from "models/User";
import { DropdownMenu } from "components/DropdownMenu";
import DropdownMenuItems from "components/DropdownMenu/DropdownMenuItems";

type Props = {
  user: User,
  users: UsersStore,
};

@observer
class UserMenu extends React.Component<Props> {
  handlePromote = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { user, users } = this.props;
    if (
      !window.confirm(
        `Are you want to make ${user.name} an admin? Admins can modify team and billing information.`
      )
    ) {
      return;
    }
    users.promote(user);
  };

  handleDemote = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { user, users } = this.props;
    if (!window.confirm(`Are you want to make ${user.name} a member?`)) {
      return;
    }
    users.demote(user);
  };

  handleSuspend = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { user, users } = this.props;
    if (
      !window.confirm(
        "Are you want to suspend this account? Suspended users will be prevented from logging in."
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
    const { user } = this.props;

    return (
      <DropdownMenu>
        <DropdownMenuItems
          items={[
            {
              title: `Make ${user.name} a member…`,
              onClick: this.handleDemote,
              visible: user.isAdmin,
            },
            {
              title: `Make ${user.name} an admin…`,
              onClick: this.handlePromote,
              visible: !user.isAdmin && !user.isSuspended,
            },
            {
              type: "separator",
            },
            {
              title: "Revoke invite…",
              onClick: this.handleRevoke,
              visible: user.isInvited,
            },
            {
              title: "Reactivate account",
              onClick: this.handleActivate,
              visible: !user.isInvited && user.isSuspended,
            },
            {
              title: "Suspend account",
              onClick: this.handleSuspend,
              visible: !user.isInvited && !user.isSuspended,
            },
          ]}
        />
      </DropdownMenu>
    );
  }
}

export default inject("users")(UserMenu);
