import { LocationDescriptor } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, ellipsis } from "@shared/styles";
import Document from "~/models/Document";
import DocumentBreadcrumb from "~/components/DocumentBreadcrumb";
import DocumentTasks from "~/components/DocumentTasks";
import Flex from "~/components/Flex";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

type Props = {
  showCollection?: boolean;
  showPublished?: boolean;
  showLastViewed?: boolean;
  showParentDocuments?: boolean;
  document: Document;
  replace?: boolean;
  to?: LocationDescriptor;
};

const DocumentMeta: React.FC<Props> = ({
  showPublished,
  showCollection,
  showLastViewed,
  showParentDocuments,
  document,
  children,
  replace,
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

  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const lastUpdatedByCurrentUser = user.id === updatedBy.id;
  const userName = updatedBy.name;
  let content;

  if (deletedAt) {
    content = (
      <span>
        {lastUpdatedByCurrentUser
          ? t("You deleted")
          : t("{{ userName }} deleted", { userName })}{" "}
        <Time dateTime={deletedAt} addSuffix />
      </span>
    );
  } else if (archivedAt) {
    content = (
      <span>
        {lastUpdatedByCurrentUser
          ? t("You archived")
          : t("{{ userName }} archived", { userName })}{" "}
        <Time dateTime={archivedAt} addSuffix />
      </span>
    );
  } else if (createdAt === updatedAt) {
    content = (
      <span>
        {lastUpdatedByCurrentUser
          ? t("You created")
          : t("{{ userName }} created", { userName })}{" "}
        <Time dateTime={updatedAt} addSuffix />
      </span>
    );
  } else if (publishedAt && (publishedAt === updatedAt || showPublished)) {
    content = (
      <span>
        {lastUpdatedByCurrentUser
          ? t("You published")
          : t("{{ userName }} published", { userName })}{" "}
        <Time dateTime={publishedAt} addSuffix />
      </span>
    );
  } else if (isDraft) {
    content = (
      <span>
        {lastUpdatedByCurrentUser
          ? t("You saved")
          : t("{{ userName }} saved", { userName })}{" "}
        <Time dateTime={updatedAt} addSuffix />
      </span>
    );
  } else {
    content = (
      <Modified highlight={modifiedSinceViewed && !lastUpdatedByCurrentUser}>
        {lastUpdatedByCurrentUser
          ? t("You updated")
          : t("{{ userName }} updated", { userName })}{" "}
        <Time dateTime={updatedAt} addSuffix />
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
      {to ? (
        <Link to={to} replace={replace}>
          {content}
        </Link>
      ) : (
        content
      )}
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

const Container = styled(Flex)<{ rtl?: boolean }>`
  justify-content: ${(props) => (props.rtl ? "flex-end" : "flex-start")};
  color: ${s("textTertiary")};
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
`;

const Viewed = styled.span`
  ${ellipsis()}
`;

const Modified = styled.span<{ highlight?: boolean }>`
  font-weight: ${(props) => (props.highlight ? "600" : "400")};
`;

export default observer(DocumentMeta);
