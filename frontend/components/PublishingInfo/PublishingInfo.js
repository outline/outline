// @flow
import React, { Component } from 'react';
import moment from 'moment';
import styled from 'styled-components';
import type { User } from 'types';
import { Flex } from 'reflexbox';

const Container = styled(Flex)`
  justify-content: space-between;
  color: #bbb;
  font-size: 13px;
`;

const Avatars = styled(Flex)`
  flex-direction: row-reverse;
  margin-right: 10px;
`;

const Avatar = styled.img`
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid #FFFFFF;
`;

class PublishingInfo extends Component {
  props: {
    collaborators?: Array<User>,
    createdAt: string,
    createdBy: User,
    updatedAt: string,
    updatedBy: User,
    views?: number,
  };

  render() {
    const {
      collaborators,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
    } = this.props;

    return (
      <Container align="center">
        {collaborators &&
          <Avatars>
            {collaborators.map(user => (
              <Avatar key={user.id} src={user.avatarUrl} title={user.name} />
            ))}
          </Avatars>}

        {createdAt == updatedAt
          ? <span>
              {createdBy.name}
              {' '}
              published
              {' '}
              {moment(createdAt).fromNow()}
            </span>
          : <span>
              {updatedBy.name}
              {' '}
              modified
              {' '}
              {moment(updatedAt).fromNow()}
            </span>}
      </Container>
    );
  }
}

export default PublishingInfo;
