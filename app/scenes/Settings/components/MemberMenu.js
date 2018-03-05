// @flow
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';

import MemberSettingsStore from 'stores/MemberSettingsStore';
import MoreIcon from 'components/Icon/MoreIcon';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
import type { User } from 'types';

type Props = {
  user: User,
  memberSettings: MemberSettingsStore,
};

@observer
class MemberMenu extends Component {
  props: Props;

  handlePromote = (ev: SyntheticEvent) => {
    ev.preventDefault();
    const { user, memberSettings } = this.props;
    if (
      !window.confirm(
        `Are you want to make ${
          user.name
        } an admin? Admins can modify team and billing information.`
      )
    ) {
      return;
    }
    memberSettings.promote(user);
  };

  handleDemote = (ev: SyntheticEvent) => {
    ev.preventDefault();
    const { user, memberSettings } = this.props;
    if (!window.confirm(`Are you want to make ${user.name} a member?`)) {
      return;
    }
    memberSettings.demote(user);
  };

  handleSuspend = (ev: SyntheticEvent) => {
    ev.preventDefault();
    const { user, memberSettings } = this.props;
    if (
      !window.confirm(
        "Are you want to suspend this account? Suspended users won't be able to access Outline."
      )
    ) {
      return;
    }
    memberSettings.suspend(user);
  };

  handleActivate = (ev: SyntheticEvent) => {
    ev.preventDefault();
    const { user, memberSettings } = this.props;
    memberSettings.activate(user);
  };

  render() {
    const { user } = this.props;

    return (
      <span>
        <DropdownMenu label={<MoreIcon />}>
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
      </span>
    );
  }
}

export default inject('memberSettings')(MemberMenu);
