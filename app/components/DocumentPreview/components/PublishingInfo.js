// @flow
import * as React from 'react';
import styled from 'styled-components';
import Collection from 'models/Collection';
import Document from 'models/Document';
import Flex from 'shared/components/Flex';
import Time from 'shared/components/Time';

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

function PublishingInfo({ collection, document }: Props) {
  const {
    modifiedSinceViewed,
    updatedAt,
    updatedBy,
    publishedAt,
    isDraft,
  } = document;

  return (
    <Container align="center">
      {publishedAt && publishedAt === updatedAt ? (
        <span>
          {updatedBy.name} published <Time dateTime={publishedAt} /> ago
        </span>
      ) : (
        <React.Fragment>
          {updatedBy.name}
          {isDraft ? (
            <span>
              &nbsp;saved <Time dateTime={updatedAt} /> ago
            </span>
          ) : (
            <Modified highlight={modifiedSinceViewed}>
              &nbsp;modified <Time dateTime={updatedAt} /> ago
            </Modified>
          )}
        </React.Fragment>
      )}
      {collection && (
        <span>
          &nbsp;in <strong>{isDraft ? 'Drafts' : collection.name}</strong>
        </span>
      )}
    </Container>
  );
}

export default PublishingInfo;
