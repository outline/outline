// @flow
import React, { Component } from 'react';
import moment from 'moment';
import styled from 'styled-components';
import Collection from 'models/Collection';
import type { User } from 'types';
import Flex from 'components/Flex';

const Container = styled(Flex)`
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
  margin-right: -13px;

  &:first-child {
    margin-right: 0;
  }
`;

class PublishingInfo extends Component {
  props: {
    collaborators?: Array<User>,
    collection?: Collection,
    createdAt: string,
    createdBy: User,
    updatedAt: string,
    updatedBy: User,
    views?: number,
  };

  render() {
    const {
      collaborators,
      collection,
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
        {createdAt === updatedAt
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
        {collection && <span>&nbsp;in <strong>{collection.name}</strong></span>}
      </Container>
    );
  }
}

export default PublishingInfo;
