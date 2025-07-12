import isEqual from "fast-deep-equal";
import orderBy from "lodash/orderBy";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { Pagination } from "@shared/constants";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import Revision from "~/models/Revision";
import Empty from "~/components/Empty";
import PaginatedEventList from "~/components/PaginatedEventList";
import useKeyDown from "~/hooks/useKeyDown";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";
import Sidebar from "./SidebarLayout";

const DocumentEvents = [
  "documents.publish",
  "documents.unpublish",
  "documents.archive",
  "documents.unarchive",
  "documents.delete",
  "documents.restore",
  "documents.add_user",
  "documents.remove_user",
  "documents.move",
];

function History() {
  const { events, documents, revisions } = useStores();
  const { t } = useTranslation();
  const match = useRouteMatch<{ documentSlug: string }>();
  const history = useHistory();
  const sidebarContext = useLocationSidebarContext();
  const document = documents.getByUrl(match.params.documentSlug);
  const [revisionsOffset, setRevisionsOffset] = React.useState(0);
  const [eventsOffset, setEventsOffset] = React.useState(0);

  const fetchHistory = React.useCallback(async () => {
    if (!document) {
      return [];
    }

    const limit = Pagination.defaultLimit;
    const [revisionsPage, eventsPage] = await Promise.all([
      revisions.fetchPage({
        documentId: document.id,
        offset: revisionsOffset,
        limit,
      }),
      events.fetchPage({
        events: DocumentEvents,
        documentId: document.id,
        offset: eventsOffset,
        limit,
      }),
    ]);

    const pageEvents = orderBy(
      [...revisionsPage, ...eventsPage],
      "createdAt",
      "desc"
    ).slice(0, limit);

    setRevisionsOffset(revisionsOffset + revisionsPage.length);
    setEventsOffset(eventsOffset + pageEvents.length - revisionsPage.length);
    return pageEvents;
  }, [document, revisions, events, revisionsOffset, eventsOffset]);

  const revisionEvents = React.useMemo(() => {
    if (!document) {
      return [];
    }

    const latestRevisionId = RevisionHelper.latestId(document.id);
    return revisions
      .getByDocumentId(document.id)
      .filter((revision: Revision) => revision.id !== latestRevisionId)
      .slice(0, revisionsOffset);
  }, [document, revisions.orderedData, revisionsOffset]);

  const nonRevisionEvents = React.useMemo(
    () =>
      document
        ? events.getByDocumentId(document.id).slice(0, eventsOffset)
        : [],
    [document, events.orderedData, eventsOffset]
  );

  const items = React.useMemo(() => {
    const merged = orderBy(
      [...revisionEvents, ...nonRevisionEvents],
      "createdAt",
      "desc"
    );

    const latestRevisionEvent = revisionEvents[0];

    if (latestRevisionEvent && document) {
      const latestRevision = revisions.get(latestRevisionEvent.id);

      const isDocUpdated =
        latestRevision?.title !== document.title ||
        !isEqual(latestRevision.data, document.data);

      if (isDocUpdated) {
        const createdById = document.updatedBy?.id ?? "";
        merged.unshift(
          new Revision(
            {
              id: RevisionHelper.latestId(document.id),
              createdAt: document.updatedAt,
              createdById,
              collaboratorIds: [createdById],
            },
            revisions
          )
        );
      }
    }

    return merged;
  }, [revisions, document, revisionEvents, nonRevisionEvents]);

  const onCloseHistory = React.useCallback(() => {
    if (document) {
      history.push({
        pathname: documentPath(document),
        state: { sidebarContext },
      });
    } else {
      history.goBack();
    }
  }, [history, document, sidebarContext]);

  useKeyDown("Escape", onCloseHistory);

  return (
    <Sidebar title={t("History")} onClose={onCloseHistory}>
      {document ? (
        <PaginatedEventList
          aria-label={t("History")}
          fetch={fetchHistory}
          items={items}
          document={document}
          empty={<EmptyHistory>{t("No history yet")}</EmptyHistory>}
        />
      ) : null}
    </Sidebar>
  );
}

const EmptyHistory = styled(Empty)`
  padding: 0 12px;
`;

export default observer(History);
