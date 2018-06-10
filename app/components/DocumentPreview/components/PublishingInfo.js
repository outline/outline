// @flow
import * as React from 'react';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import styled from 'styled-components';
import Collection from 'models/Collection';
import Document from 'models/Document';
import Flex from 'shared/components/Flex';

const Container = styled(Flex)`
  color: ${props => props.theme.slate};
  font-size: 13px;
`;

const Modified = styled.span`
  color: ${props =>
    props.highlight ? props.theme.slateDark : props.theme.slate};
  font-weight: ${props => (props.highlight ? '600' : '400')};
`;

type Props = {
  collection?: Collection,
  document: Document,
  views?: number,
};

class PublishingInfo extends React.Component<Props> {
  render() {
    const { collection, document } = this.props;
    const {
      modifiedSinceViewed,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
      publishedAt,
    } = document;

    const timeAgo = `${distanceInWordsToNow(new Date(createdAt))} ago`;

    return (
      <Container align="center">
        {publishedAt === updatedAt ? (
          <span>
            {createdBy.name} published {timeAgo}
          </span>
        ) : (
          <React.Fragment>
            {updatedBy.name}
            {publishedAt ? (
              <Modified highlight={modifiedSinceViewed}>
                &nbsp;modified {timeAgo}
              </Modified>
            ) : (
              <span>&nbsp;saved {timeAgo}</span>
            )}
          </React.Fragment>
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
