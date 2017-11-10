// @flow
import React, { Component } from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { color } from 'shared/styles/constants';
import Collection from 'models/Collection';
import Document from 'models/Document';
import Flex from 'shared/components/Flex';

const Container = styled(Flex)`
  color: ${color.slate};
  font-size: 13px;
`;

const Modified = styled.span`
  color: ${props => (props.highlight ? color.slateDark : color.slate)};
  font-weight: ${props => (props.highlight ? '600' : '400')};
`;

class PublishingInfo extends Component {
  props: {
    collection?: Collection,
    document: Document,
    views?: number,
  };

  render() {
    const { collection, document } = this.props;
    const {
      modifiedSinceViewed,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
    } = document;

    return (
      <Container align="center">
        {createdAt === updatedAt ? (
          <span>
            {createdBy.name} published {moment(createdAt).fromNow()}
          </span>
        ) : (
          <span>
            {updatedBy.name}
            <Modified highlight={modifiedSinceViewed}>
              {' '}
              modified {moment(updatedAt).fromNow()}
            </Modified>
          </span>
        )}
        {collection && (
          <span>
            &nbsp;in <strong>{collection.name}</strong>
          </span>
        )}
      </Container>
    );
  }
}

export default PublishingInfo;
