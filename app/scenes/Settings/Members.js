// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';
import Avatar from 'components/Avatar';
import { color } from 'shared/styles/constants';

import ErrorsStore from 'stores/ErrorsStore';
import SettingsStore from 'stores/SettingsStore';
import CenteredContent from 'components/CenteredContent';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import PageTitle from 'components/PageTitle';

@observer
class Members extends Component {
  props: {
    errors: ErrorsStore,
    settings: SettingsStore,
  };

  @observable members;
  @observable isLoaded: boolean = false;

  @observable inviteEmails: string = '';
  @observable isInviting: boolean = false;

  componentDidMount() {
    this.props.settings.fetchMembers();
  }

  render() {
    return (
      <CenteredContent>
        <PageTitle title="Members" />
        <h1>Members</h1>

        {!this.props.settings.isFetching ? (
          <Flex column>
            {this.props.settings.members && (
              <MemberList>
                {this.props.settings.members.map(member => (
                  <Member auto justify="space-between">
                    <Flex>
                      <Avatar src={member.avatarUrl} />
                      <UserName>
                        {member.name} {member.email && `(${member.email})`}
                        {member.isAdmin && <AdminBadge>Admin</AdminBadge>}
                      </UserName>
                    </Flex>
                  </Member>
                ))}
              </MemberList>
            )}
          </Flex>
        ) : (
          <LoadingPlaceholder />
        )}
      </CenteredContent>
    );
  }
}

const MemberList = styled(Flex)`
  border: 1px solid ${color.smoke};
  border-radius: 4px;

  margin-top: 20px;
  margin-bottom: 40px;
`;

const Member = styled(Flex)`
  padding: 10px;
  border-bottom: 1px solid ${color.smoke};
  font-size: 15px;

  &:last-child {
    border-bottom: none;
  }
`;

const UserName = styled.span`
  padding-left: 8px;
`;

const AdminBadge = styled.span`
  margin-left: 10px;
  color: #777;
  font-size: 13px;
  text-transform: uppercase;
  font-weight: normal;
`;

export default inject('errors', 'settings')(Members);
