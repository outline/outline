// @flow
import * as React from 'react';
import { inject } from 'mobx-react';
import styled from 'styled-components';
import Document from 'models/Document';
import Flex from 'shared/components/Flex';
import Time from 'shared/components/Time';
import Breadcrumb from 'shared/components/Breadcrumb';
import CollectionsStore from 'stores/CollectionsStore';

const Container = styled(Flex)`
  color: ${props => props.theme.textTertiary};
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
`;

const Modified = styled.span`
  color: ${props =>
    props.highlight ? props.theme.text : props.theme.textTertiary};
  font-weight: ${props => (props.highlight ? '600' : '400')};
`;

type Props = {
  collections: CollectionsStore,
  showCollection?: boolean,
  showPublished?: boolean,
  document: Document,
  views?: number,
};

function PublishingInfo({
  collections,
  showPublished,
  showCollection,
  document,
}: Props) {
  const {
    modifiedSinceViewed,
    updatedAt,
    updatedBy,
    publishedAt,
    archivedAt,
    deletedAt,
    isDraft,
  } = document;

  const neverUpdated = publishedAt === updatedAt;
  let content;

  if (deletedAt) {
    content = (
      <span>
        &nbsp;deleted <Time dateTime={deletedAt} /> ago
      </span>
    );
  } else if (archivedAt) {
    content = (
      <span>
        &nbsp;archived <Time dateTime={archivedAt} /> ago
      </span>
    );
  } else if (publishedAt && (neverUpdated || showPublished)) {
    content = (
      <span>
        &nbsp;published <Time dateTime={publishedAt} /> ago
      </span>
    );
  } else if (isDraft) {
    content = (
      <span>
        &nbsp;saved <Time dateTime={updatedAt} /> ago
      </span>
    );
  } else {
    content = (
      <Modified highlight={modifiedSinceViewed}>
        &nbsp;updated <Time dateTime={updatedAt} /> ago
      </Modified>
    );
  }

  const collection = collections.get(document.collectionId);

  return (
    <Container align="center">
      {updatedBy.name}
      {content}
      {showCollection &&
        collection && (
          <span>
            &nbsp;in&nbsp;
            <strong>
              {isDraft ? 'Drafts' : <Breadcrumb document={document} onlyText />}
            </strong>
          </span>
        )}
    </Container>
  );
}

export default inject('collections')(PublishingInfo);
