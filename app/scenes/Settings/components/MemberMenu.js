// @flow
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';

import MembersStore from 'stores/settings/MembersStore';
import MoreIcon from 'components/Icon/MoreIcon';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
import type { User } from 'types';

type Props = {
  user: User,
  members: MembersStore,
};

@observer
class MemberMenu extends Component {
  props: Props;

  handlePromote = (ev: SyntheticEvent) => {
    ev.preventDefault();
  };

  handleDemote = (ev: SyntheticEvent) => {
    ev.preventDefault();
  };

  handleSuspend = (ev: SyntheticEvent) => {
    ev.preventDefault();
  };

  handleActivate = (ev: SyntheticEvent) => {
    ev.preventDefault();
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
              Activate account…
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

export default inject('members')(MemberMenu);
