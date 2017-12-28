// @flow
import React, { Component } from 'react';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import invariant from 'invariant';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';
import Avatar from 'components/Avatar';
import { color, layout } from 'shared/styles/constants';

import { client } from 'utils/ApiClient';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';

@observer
class Members extends Component {
  @observable members;
  @observable isLoaded: boolean = false;

  componentDidMount() {
    this.fetchMembers();
  }

  async fetchMembers() {
    try {
      const res = await client.post(`/team.users`);
      invariant(res && res.data, 'Unable ');
      const { data } = res;
      runInAction('Members#fetchMembers', () => {
        this.members = data;
      });
    } catch (e) {
      // show error
    }
  }

  render() {
    return (
      <CenteredContent>
        <PageTitle title="Members" />
        <h1>Members</h1>
        {this.members && (
          <MemberList>
            {this.members.map(member => (
              <Member auto justify="space-between">
                <Flex>
                  <Avatar src={member.avatarUrl} />
                  <UserName>
                    {member.name} &middot; {member.email}
                    {member.isAdmin && <AdminBadge>Admin</AdminBadge>}
                  </UserName>
                </Flex>
                <Flex>
                  <Action onClick={() => { }}>Make admin</Action>
                </Flex>
              </Member>
            ))}
          </MemberList>
        )}
      </CenteredContent>
    );
  }
}

const MemberList = styled(Flex) `
  border: 1px solid ${color.smoke};
  border-radius: 4px;
`;

const Member = styled(Flex) `
  padding: 4px 10px;
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

const Action = styled.span``;

export default Members;
