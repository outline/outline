// @flow
import * as React from "react";
import { inject, observer } from "mobx-react";
import styled from "styled-components";
import Document from "models/Document";
import Flex from "shared/components/Flex";
import Time from "shared/components/Time";
import Breadcrumb from "shared/components/Breadcrumb";
import CollectionsStore from "stores/CollectionsStore";
import AuthStore from "stores/AuthStore";

const Container = styled(Flex)`
  color: ${props => props.theme.textTertiary};
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
`;

const Modified = styled.span`
  color: ${props =>
    props.highlight ? props.theme.text : props.theme.textTertiary};
  font-weight: ${props => (props.highlight ? "600" : "400")};
`;

type Props = {
  collections: CollectionsStore,
  auth: AuthStore,
  showCollection?: boolean,
  showPublished?: boolean,
  document: Document,
  children: React.Node,
};

function PublishingInfo({
  auth,
  collections,
  showPublished,
  showCollection,
  document,
  children,
  ...rest
}: Props) {
  const {
    modifiedSinceViewed,
    updatedAt,
    updatedBy,
    createdAt,
    publishedAt,
    archivedAt,
    deletedAt,
    isDraft,
  } = document;

  // Prevent meta information from displaying if updatedBy is not available.
  // Currently the situation where this is true is rendering share links.
  if (!updatedBy) {
    return null;
  }

  let content;

  if (deletedAt) {
    content = (
      <span>
        deleted <Time dateTime={deletedAt} /> ago
      </span>
    );
  } else if (archivedAt) {
    content = (
      <span>
        archived <Time dateTime={archivedAt} /> ago
      </span>
    );
  } else if (createdAt === updatedAt) {
    content = (
      <span>
        created <Time dateTime={updatedAt} /> ago
      </span>
    );
  } else if (publishedAt && (publishedAt === updatedAt || showPublished)) {
    content = (
      <span>
        published <Time dateTime={publishedAt} /> ago
      </span>
    );
  } else if (isDraft) {
    content = (
      <span>
        saved <Time dateTime={updatedAt} /> ago
      </span>
    );
  } else {
    content = (
      <Modified highlight={modifiedSinceViewed}>
        updated <Time dateTime={updatedAt} /> ago
      </Modified>
    );
  }

  const collection = collections.get(document.collectionId);
  const updatedByMe = auth.user && auth.user.id === updatedBy.id;

  return (
    <Container align="center" {...rest}>
      {updatedByMe ? "You" : updatedBy.name}&nbsp;
      {content}
      {showCollection &&
        collection && (
          <span>
            &nbsp;in&nbsp;
            <strong>
              <Breadcrumb document={document} onlyText />
            </strong>
          </span>
        )}
      {children}
    </Container>
  );
}

export default inject("collections", "auth")(observer(PublishingInfo));
