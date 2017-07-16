// @flow
import React, { Component } from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { color } from 'styles/constants';
import Collection from 'models/Collection';
import Document from 'models/Document';
import type { User } from 'types';
import Flex from 'components/Flex';

const Container = styled(Flex)`
  color: ${color.slate};
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
  border: 2px solid ${color.white};
  margin-right: -13px;

  &:first-child {
    margin-right: 0;
  }
`;

const Modified = styled.span`
  color: ${props => (props.highlight ? color.slateDark : color.slate)};
  font-weight: ${props => (props.highlight ? '600' : '400')};
`;

class PublishingInfo extends Component {
  props: {
    collaborators?: Array<User>,
    collection?: Collection,
    document: Document,
    views?: number,
  };

  render() {
    const { collaborators, collection, document } = this.props;
    const {
      modifiedSinceViewed,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
    } = document;

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
              <Modified highlight={modifiedSinceViewed}>
                {' '}
                modified
                {' '}
                {moment(updatedAt).fromNow()}
              </Modified>
            </span>}
        {collection && <span>&nbsp;in <strong>{collection.name}</strong></span>}
      </Container>
    );
  }
}

export default PublishingInfo;
