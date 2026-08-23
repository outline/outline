import { subYears } from "date-fns";
import type { LocationDescriptor } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ellipsis } from "@shared/styles";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import DocumentBreadcrumb from "~/components/DocumentBreadcrumb";
import DocumentTasks from "~/components/DocumentTasks";
import Flex from "~/components/Flex";
import { MetaButton, Separator, metaStyles } from "~/components/HeaderMeta";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

type Props = {
  /** Additional content appended to the end of the meta. */
  children?: React.ReactNode;
  /** Show the collection that the document belongs to. */
  showCollection?: boolean;
  /** Show the published time, even when the document has since been updated. */
  showPublished?: boolean;
  /** Show when the current user last viewed the document. */
  showLastViewed?: boolean;
  /** Show the number of documents nested under this one. */
  showParentDocuments?: boolean;
  /** The document to display meta information for. */
  document: Document;
  /** A revision of the document, when displaying meta for a point in history. */
  revision?: Revision;
  /** Replace the current history entry instead of pushing a new one when `to` is set. */
  replace?: boolean;
  /** Destination to link the meta content to. */
  to?: LocationDescriptor;
  /** Called when the meta content is clicked, renders it as a button. Takes precedence over `to`. */
  onClick?: () => void;
};

const DocumentMeta: React.FC<Props> = ({
  showPublished,
  showCollection,
  showLastViewed,
  showParentDocuments,
  document,
  revision,
  children,
  replace,
  to,
  onClick,
  ...rest
}: Props) => {
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

  if (revision) {
    content = (
      <span>
        {revision.createdBy?.id === user.id
          ? t("You updated")
          : t("{{ userName }} updated", { userName })}{" "}
        <Time dateTime={revision.createdAt} addSuffix />
      </span>
    );
  } else if (deletedAt) {
    content = (
      <span>
        {document.deletedBy?.id === user.id
          ? t("You deleted")
          : t("{{ userName }} deleted", {
              userName: document.deletedBy?.name ?? t("Unknown"),
            })}{" "}
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
  } else if (
    document.sourceMetadata &&
    document.sourceMetadata?.importedAt &&
    document.sourceMetadata.importedAt >= updatedAt
  ) {
    content = (
      <span>
        {document.sourceMetadata.createdByName
          ? t("{{ userName }} updated", {
              userName: document.sourceMetadata.createdByName,
            })
          : t("Imported")}{" "}
        <Time dateTime={createdAt} addSuffix />
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
    ? collection.getChildrenForDocument(document.id).length
    : 0;
  const canShowProgressBar = isTasks;

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
          <Separator />
          <Modified highlight>{t("Never viewed")}</Modified>
        </Viewed>
      );
    }

    // Hide the section entirely once the last view is over a year old.
    if (new Date(lastViewedAt) < subYears(new Date(), 1)) {
      return null;
    }

    return (
      <Viewed>
        <Separator />
        {t("Viewed")} <Time dateTime={lastViewedAt} addSuffix shorten />
      </Viewed>
    );
  };

  return (
    <Container align="center" $rtl={document.dir === "rtl"} {...rest} dir="ltr">
      {onClick ? (
        <MetaButton onClick={onClick}>{content}</MetaButton>
      ) : to ? (
        <Link to={to} replace={replace}>
          {content}
        </Link>
      ) : (
        content
      )}
      {showCollection && collection && (
        <span>
          &nbsp;{t("in")}&nbsp;
          <Strong>
            <DocumentBreadcrumb document={document} maxDepth={1} onlyText />
          </Strong>
        </span>
      )}
      {showParentDocuments && nestedDocumentsCount > 0 && (
        <span>
          <Separator />
          {nestedDocumentsCount}{" "}
          {t("nested document", {
            count: nestedDocumentsCount,
          })}
        </span>
      )}
      {timeSinceNow()}
      {canShowProgressBar && (
        <>
          <Separator />
          <DocumentTasks document={document} />
        </>
      )}
      {children}
    </Container>
  );
};

const Strong = styled.strong`
  font-weight: 550;
`;

const Container = styled(Flex)<{ $rtl?: boolean }>`
  ${metaStyles}
`;

const Viewed = styled.span`
  ${ellipsis()}
`;

const Modified = styled.span<{ highlight?: boolean }>`
  font-weight: ${(props) => (props.highlight ? "600" : "400")};
`;

export default observer(DocumentMeta);
