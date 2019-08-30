// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { MoreIcon } from 'outline-icons';

import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
import NudeButton from 'components/NudeButton';
import UsersStore from 'stores/UsersStore';
import User from 'models/User';

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
        `Are you want to make ${
          user.name
        } an admin? Admins can modify team and billing information.`
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
        "Are you want to suspend this account? Suspended users won't be able to access Outline."
      )
    ) {
      return;
    }
    users.suspend(user);
  };

  handleActivate = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { user, users } = this.props;
    users.activate(user);
  };

  render() {
    const { user } = this.props;

    return (
      <DropdownMenu
        label={
          <NudeButton>
            <MoreIcon />
          </NudeButton>
        }
      >
        {!user.isSuspended &&
          (user.isAdmin ? (
            <DropdownMenuItem onClick={this.handleDemote}>
              Make {user.name} a member…
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={this.handlePromote}>
              Make {user.name} an admin…
            </DropdownMenuItem>
          ))}
        {user.isSuspended ? (
          <DropdownMenuItem onClick={this.handleActivate}>
            Activate account
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={this.handleSuspend}>
            Suspend account…
          </DropdownMenuItem>
        )}
      </DropdownMenu>
    );
  }
}

export default inject('users')(UserMenu);
