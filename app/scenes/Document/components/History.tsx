import orderBy from "lodash/orderBy";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { Pagination } from "@shared/constants";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import Document from "~/models/Document";
import EventModel from "~/models/Event";
import Revision from "~/models/Revision";
import Empty from "~/components/Empty";
import {
  DocumentEvent,
  RevisionEvent,
  type Event,
} from "~/components/EventListItem";
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

  const [, setForceRender] = React.useState(0);
  const offset = React.useMemo(() => ({ revisions: 0, events: 0 }), []);

  const toEvent = React.useCallback(
    (data: Revision | EventModel<Document>): Event => {
      if (data instanceof Revision) {
        return {
          id: data.id,
          name: "revisions.create",
          actor: data.createdBy,
          createdAt: data.createdAt,
          latest: false,
        } satisfies Event;
      }

      return {
        id: data.id,
        name: data.name as DocumentEvent["name"],
        actor: data.actor,
        user: data.user,
        createdAt: data.createdAt,
      } satisfies Event;
    },
    []
  );

  const fetchHistory = React.useCallback(async () => {
    if (!document) {
      return [];
    }

    const [revisionsArr, eventsArr] = await Promise.all([
      revisions.fetchPage({
        documentId: document.id,
        offset: offset.revisions,
        limit: Pagination.defaultLimit,
      }),
      events.fetchPage({
        events: DocumentEvents,
        documentId: document.id,
        offset: offset.events,
        limit: Pagination.defaultLimit,
      }),
    ]);

    const pageEvents = orderBy(
      [...revisionsArr, ...eventsArr].map(toEvent),
      "createdAt",
      "desc"
    ).slice(0, Pagination.defaultLimit);

    const revisionsCount = pageEvents.filter(
      (event) => event.name === "revisions.create"
    ).length;

    offset.revisions += revisionsCount;
    offset.events += pageEvents.length - revisionsCount;

    // needed to re-render after mobx store and offset is updated
    setForceRender((s) => ++s);

    return pageEvents;
  }, [document, revisions, events, toEvent, offset]);

  const revisionEvents = React.useMemo(
    () =>
      document
        ? revisions
            .filter({ documentId: document.id })
            .slice(0, offset.revisions + 1) // take one extra to account for realtime edits
            .map(toEvent)
        : [],
    [document, revisions, offset.revisions, toEvent]
  );
  const otherEvents = React.useMemo(
    () =>
      document
        ? events
            .filter({ documentId: document.id })
            .slice(0, offset.events)
            .map(toEvent)
        : [],
    [document, events, offset.events, toEvent]
  );

  const latestRevision = revisionEvents[0];

  if (latestRevision && document) {
    if (latestRevision.createdAt !== document.updatedAt) {
      revisionEvents.unshift({
        id: RevisionHelper.latestId(document.id),
        name: "revisions.create",
        createdAt: document.updatedAt,
        actor: document.updatedBy!,
        latest: true,
      });
    } else {
      (latestRevision as RevisionEvent).latest = true;
    }
  }

  const mergedEvents = React.useMemo(
    () => orderBy([...revisionEvents, ...otherEvents], "createdAt", "desc"),
    [revisionEvents, otherEvents]
  );

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
          events={mergedEvents}
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
