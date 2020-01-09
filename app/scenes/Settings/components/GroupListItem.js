// @flow
import * as React from 'react';
import styled from 'styled-components';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import UserMenu from 'menus/UserMenu';
import Avatar from 'components/Avatar';
import Badge from 'components/Badge';
import UserProfile from 'scenes/UserProfile';
import ListItem from 'components/List/Item';
import Time from 'shared/components/Time';
import Group from 'models/Group';

type Props = {
  group: Group,
};

@observer
class GroupListItem extends React.Component<Props> {
  // @observable profileOpen: boolean = false;
  // maybe needs to handle open state for group list

  // handleOpenProfile = () => {
  //   this.profileOpen = true;
  // };

  // handleCloseProfile = () => {
  //   this.profileOpen = false;
  // };

  render() {
    const { group } = this.props;

    return (
      <ListItem
        title={<Title onClick={() => {}}>{group.name}</Title>}
        // image={
        //   <React.Fragment>
        //     <Avatar
        //       src={user.avatarUrl}
        //       size={40}
        //       onClick={this.handleOpenProfile}
        //     />
        //     <UserProfile
        //       user={user}
        //       isOpen={this.profileOpen}
        //       onRequestClose={this.handleCloseProfile}
        //     />
        //   </React.Fragment>
        // }
        subtitle={<React.Fragment>10 members</React.Fragment>}
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

export default GroupListItem;
