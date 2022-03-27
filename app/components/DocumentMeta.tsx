import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Document from "~/models/Document";
import DocumentBreadcrumb from "~/components/DocumentBreadcrumb";
import DocumentTasks from "~/components/DocumentTasks";
import Flex from "~/components/Flex";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

const Container = styled(Flex)<{ rtl?: boolean }>`
  justify-content: ${(props) => (props.rtl ? "flex-end" : "flex-start")};
  color: ${(props) => props.theme.textTertiary};
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
`;

const Viewed = styled.span`
  text-overflow: ellipsis;
  overflow: hidden;
`;

const Modified = styled.span<{ highlight?: boolean }>`
  font-weight: ${(props) => (props.highlight ? "600" : "400")};
`;

type Props = {
  showCollection?: boolean;
  showPublished?: boolean;
  showLastViewed?: boolean;
  showParentDocuments?: boolean;
  document: Document;
  to?: string;
};

const DocumentMeta: React.FC<Props> = ({
  showPublished,
  showCollection,
  showLastViewed,
  showParentDocuments,
  document,
  children,
  to,
  ...rest
}) => {
  const { t } = useTranslation();
  const { collections } = useStores();
  const user = useCurrentUser();
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
    isTasks,
    isTemplate,
  } = document;

  // Prevent meta information from displaying if updatedBy is not available.
  // Currently the situation where this is true is rendering share links.
  if (!updatedBy) {
    return null;
  }

  const collection = collections.get(document.collectionId);
  const lastUpdatedByCurrentUser = user.id === updatedBy.id;
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
      <Modified highlight={modifiedSinceViewed && !lastUpdatedByCurrentUser}>
        {t("updated")} <Time dateTime={updatedAt} addSuffix />
      </Modified>
    );
  }

  const nestedDocumentsCount = collection
    ? collection.getDocumentChildren(document.id).length
    : 0;
  const canShowProgressBar = isTasks && !isTemplate;

  const timeSinceNow = () => {
    if (isDraft || !showLastViewed) {
      return null;
    }

    if (!lastViewedAt) {
      if (lastUpdatedByCurrentUser) {
        return null;
      }
      return (
        <Viewed>
          •&nbsp;<Modified highlight>{t("Never viewed")}</Modified>
        </Viewed>
      );
    }

    return (
      <Viewed>
        •&nbsp;{t("Viewed")} <Time dateTime={lastViewedAt} addSuffix shorten />
      </Viewed>
    );
  };

  return (
    <Container align="center" rtl={document.dir === "rtl"} {...rest} dir="ltr">
      {lastUpdatedByCurrentUser ? t("You") : updatedBy.name}&nbsp;
      {to ? <Link to={to}>{content}</Link> : content}
      {showCollection && collection && (
        <span>
          &nbsp;{t("in")}&nbsp;
          <strong>
            <DocumentBreadcrumb document={document} onlyText />
          </strong>
        </span>
      )}
      {showParentDocuments && nestedDocumentsCount > 0 && (
        <span>
          &nbsp;• {nestedDocumentsCount}{" "}
          {t("nested document", {
            count: nestedDocumentsCount,
          })}
        </span>
      )}
      &nbsp;{timeSinceNow()}
      {canShowProgressBar && (
        <>
          &nbsp;•&nbsp;
          <DocumentTasks document={document} />
        </>
      )}
      {children}
    </Container>
  );
};

export default observer(DocumentMeta);
