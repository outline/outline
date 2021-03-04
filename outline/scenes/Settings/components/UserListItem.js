// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import User from "models/User";
import UserProfile from "scenes/UserProfile";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import ListItem from "components/List/Item";
import Time from "components/Time";
import UserMenu from "menus/UserMenu";

type Props = {
  user: User,
  showMenu: boolean,
};

@observer
class UserListItem extends React.Component<Props> {
  @observable profileOpen: boolean = false;

  handleOpenProfile = () => {
    this.profileOpen = true;
  };

  handleCloseProfile = () => {
    this.profileOpen = false;
  };

  render() {
    const { user, showMenu } = this.props;

    return (
      <ListItem
        title={<Title onClick={this.handleOpenProfile}>{user.name}</Title>}
        image={
          <>
            <Avatar
              src={user.avatarUrl}
              size={40}
              onClick={this.handleOpenProfile}
            />
            <UserProfile
              user={user}
              isOpen={this.profileOpen}
              onRequestClose={this.handleCloseProfile}
            />
          </>
        }
        subtitle={
          <>
            {user.email ? `${user.email} · ` : undefined}
            {user.lastActiveAt ? (
              <>
                Active <Time dateTime={user.lastActiveAt} /> ago
              </>
            ) : (
              "Invited"
            )}
            {user.isAdmin && <Badge primary={user.isAdmin}>Admin</Badge>}
            {user.isSuspended && <Badge>Suspended</Badge>}
          </>
        }
        actions={showMenu ? <UserMenu user={user} /> : undefined}
      />
    );
  }
}

const Title = styled.span`
  &:hover {
    text-decoration: underline;
    cursor: pointer;
  }
`;

export default UserListItem;
