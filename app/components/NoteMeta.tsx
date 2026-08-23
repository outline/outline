import { subYears } from "date-fns";
import type { LocationDescriptor } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, ellipsis } from "@shared/styles";
import type Note from "~/models/Note";
import type Revision from "~/models/Revision";
import NoteBreadcrumb from "~/components/NoteBreadcrumb";
import NoteTasks from "~/components/NoteTasks";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
type Props = {
  /** Additional content appended to the end of the meta. */
  children?: React.ReactNode;
  /** Show the notebook that the note belongs to. */
  showNotebook?: boolean;
  /** Show the published time, even when the note has since been updated. */
  showPublished?: boolean;
  /** Show when the current user last viewed the note. */
  showLastViewed?: boolean;
  /** Show the number of notes nested under this one. */
  showParentNotes?: boolean;
  /** The note to display meta information for. */
  note: Note;
  /** A revision of the note, when displaying meta for a point in history. */
  revision?: Revision;
  /** Replace the current history entry instead of pushing a new one when `to` is set. */
  replace?: boolean;
  /** Destination to link the meta content to. */
  to?: LocationDescriptor;
  /** Called when the meta content is clicked, renders it as a button. Takes precedence over `to`. */
  onClick?: () => void;
};
const NoteMeta: React.FC<Props> = ({
  showPublished,
  showNotebook,
  showLastViewed,
  showParentNotes,
  note,
  revision,
  children,
  replace,
  to,
  onClick,
  ...rest
}: Props) => {
  const { t } = useTranslation();
  const { notebooks } = useStores();
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
  } = note;
  // Prevent meta information from displaying if updatedBy is not available.
  // Currently the situation where this is true is rendering share links.
  if (!updatedBy) {
    return null;
  }
  const notebook = note.notebookId ? notebooks.get(note.notebookId) : undefined;
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
  } else if (
    note.sourceMetadata &&
    note.sourceMetadata?.importedAt &&
    note.sourceMetadata.importedAt >= updatedAt
  ) {
    content = (
      <span>
        {note.sourceMetadata.createdByName
          ? t("{{ userName }} updated", {
              userName: note.sourceMetadata.createdByName,
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
  const nestedNotesCount = notebook
    ? notebook.getChildrenForNote(note.id).length
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
    <Container align="center" $rtl={note.dir === "rtl"} {...rest} dir="ltr">
      {onClick ? (
        <MetaButton onClick={onClick}>{content}</MetaButton>
      ) : to ? (
        <Link to={to} replace={replace}>
          {content}
        </Link>
      ) : (
        content
      )}
      {showNotebook && notebook && (
        <span>
          &nbsp;{t("in")}&nbsp;
          <Strong>
            <NoteBreadcrumb note={note} maxDepth={1} onlyText />
          </Strong>
        </span>
      )}
      {showParentNotes && nestedNotesCount > 0 && (
        <span>
          <Separator />
          {nestedNotesCount}{" "}
          {t("nested document", {
            count: nestedNotesCount,
          })}
        </span>
      )}
      {timeSinceNow()}
      {canShowProgressBar && (
        <>
          <Separator />
          <NoteTasks note={note} />
        </>
      )}
      {children}
    </Container>
  );
};
/** A button that visually matches the surrounding meta text. */
export const MetaButton = styled(NudeButton)`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  width: auto;
  height: auto;
  border-radius: 0;
  color: inherit;
  font: inherit;
  text-align: inherit;

  &:hover {
    text-decoration: underline;
  }
`;
export const Separator = styled.span`
  padding: 0 0.4em;

  &::after {
    content: "•";
  }
`;
const Strong = styled.strong`
  font-weight: 550;
`;
const Container = styled(Flex)<{
  $rtl?: boolean;
}>`
  justify-content: ${(props) => (props.$rtl ? "flex-end" : "flex-start")};
  color: ${s("textTertiary")};
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
`;
const Viewed = styled.span`
  ${ellipsis()}
`;
const Modified = styled.span<{
  highlight?: boolean;
}>`
  font-weight: ${(props) => (props.highlight ? "600" : "400")};
`;
export default observer(NoteMeta);
