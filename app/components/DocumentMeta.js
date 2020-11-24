// @flow
import { inject, observer } from "mobx-react";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import AuthStore from "stores/AuthStore";
import CollectionsStore from "stores/CollectionsStore";
import Document from "models/Document";
import Breadcrumb from "components/Breadcrumb";
import Flex from "components/Flex";
import Time from "components/Time";

const Container = styled(Flex)`
  color: ${(props) => props.theme.textTertiary};
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
`;

const Modified = styled.span`
  color: ${(props) => props.theme.textTertiary};
  font-weight: ${(props) => (props.highlight ? "600" : "400")};
`;

type Props = {
  collections: CollectionsStore,
  auth: AuthStore,
  showCollection?: boolean,
  showPublished?: boolean,
  showLastViewed?: boolean,
  document: Document,
  children: React.Node,
  to?: string,
};

function DocumentMeta({
  auth,
  collections,
  showPublished,
  showCollection,
  showLastViewed,
  document,
  children,
  to,
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
    lastViewedAt,
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
        deleted <Time dateTime={deletedAt} addSuffix />
      </span>
    );
  } else if (archivedAt) {
    content = (
      <span>
        archived <Time dateTime={archivedAt} addSuffix />
      </span>
    );
  } else if (createdAt === updatedAt) {
    content = (
      <span>
        created <Time dateTime={updatedAt} addSuffix />
      </span>
    );
  } else if (publishedAt && (publishedAt === updatedAt || showPublished)) {
    content = (
      <span>
        published <Time dateTime={publishedAt} addSuffix />
      </span>
    );
  } else if (isDraft) {
    content = (
      <span>
        saved <Time dateTime={updatedAt} addSuffix />
      </span>
    );
  } else {
    content = (
      <Modified highlight={modifiedSinceViewed}>
        updated <Time dateTime={updatedAt} addSuffix />
      </Modified>
    );
  }

  const collection = collections.get(document.collectionId);
  const updatedByMe = auth.user && auth.user.id === updatedBy.id;

  const timeSinceNow = () => {
    if (isDraft || !showLastViewed) {
      return null;
    }
    if (!lastViewedAt) {
      return (
        <>
          •&nbsp;<Modified highlight>Never viewed</Modified>
        </>
      );
    }

    return (
      <span>
        •&nbsp;Viewed <Time dateTime={lastViewedAt} addSuffix shorten />
      </span>
    );
  };

  return (
    <Container align="center" {...rest}>
      {updatedByMe ? "You" : updatedBy.name}&nbsp;
      {to ? <Link to={to}>{content}</Link> : content}
      {showCollection && collection && (
        <span>
          &nbsp;in&nbsp;
          <strong>
            <Breadcrumb document={document} onlyText />
          </strong>
        </span>
      )}
      &nbsp;{timeSinceNow()}
      {children}
    </Container>
  );
}

export default inject("collections", "auth")(observer(DocumentMeta));
