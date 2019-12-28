// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';

import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
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
        'Are you want to suspend this account? Suspended users will be prevented from logging in.'
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
        {!user.lastActiveAt && (
          <DropdownMenuItem onClick={this.handleRevoke}>
            Revoke invite…
          </DropdownMenuItem>
        )}
        {user.lastActiveAt &&
          (user.isSuspended ? (
            <DropdownMenuItem onClick={this.handleActivate}>
              Activate account
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={this.handleSuspend}>
              Suspend account…
            </DropdownMenuItem>
          ))}
      </DropdownMenu>
    );
  }
}

export default inject('users')(UserMenu);
