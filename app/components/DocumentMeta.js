// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Document from "models/Document";
import Breadcrumb from "components/Breadcrumb";
import Flex from "components/Flex";
import Time from "components/Time";
import useStores from "hooks/useStores";

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
  showCollection?: boolean,
  showPublished?: boolean,
  showLastViewed?: boolean,
  document: Document,
  children: React.Node,
  to?: string,
};

function DocumentMeta({
  showPublished,
  showCollection,
  showLastViewed,
  document,
  children,
  to,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const { collections, auth } = useStores();
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
        {t("deleted")} <Time dateTime={deletedAt} addSuffix />
      </span>
    );
  } else if (archivedAt) {
    content = (
      <span>
        {t("archived")} <Time dateTime={archivedAt} addSuffix />
      </span>
    );
  } else if (createdAt === updatedAt) {
    content = (
      <span>
        {t("created")} <Time dateTime={updatedAt} addSuffix />
      </span>
    );
  } else if (publishedAt && (publishedAt === updatedAt || showPublished)) {
    content = (
      <span>
        {t("published")} <Time dateTime={publishedAt} addSuffix />
      </span>
    );
  } else if (isDraft) {
    content = (
      <span>
        {t("saved")} <Time dateTime={updatedAt} addSuffix />
      </span>
    );
  } else {
    content = (
      <Modified highlight={modifiedSinceViewed}>
        {t("updated")} <Time dateTime={updatedAt} addSuffix />
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
          •&nbsp;<Modified highlight>{t("Never viewed")}</Modified>
        </>
      );
    }

    return (
      <span>
        •&nbsp;{t("Viewed")} <Time dateTime={lastViewedAt} addSuffix shorten />
      </span>
    );
  };

  return (
    <Container align="center" {...rest}>
      {updatedByMe ? t("You") : updatedBy.name}&nbsp;
      {to ? <Link to={to}>{content}</Link> : content}
      {showCollection && collection && (
        <span>
          &nbsp;{t("in")}&nbsp;
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

export default observer(DocumentMeta);
