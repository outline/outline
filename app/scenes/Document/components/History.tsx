import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import Event from "~/models/Event";
import Empty from "~/components/Empty";
import PaginatedEventList from "~/components/PaginatedEventList";
import useKeyDown from "~/hooks/useKeyDown";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";
import Sidebar from "./SidebarLayout";

const EMPTY_ARRAY: Event[] = [];

function History() {
  const { events, documents } = useStores();
  const { t } = useTranslation();
  const match = useRouteMatch<{ documentSlug: string }>();
  const history = useHistory();
  const document = documents.getByUrl(match.params.documentSlug);

  const eventsInDocument = document
    ? events.filter({ documentId: document.id })
    : EMPTY_ARRAY;

  const onCloseHistory = () => {
    if (document) {
      history.push(documentPath(document));
    } else {
      history.goBack();
    }
  };

  const items = React.useMemo(() => {
    if (
      eventsInDocument[0] &&
      document &&
      eventsInDocument[0].createdAt !== document.updatedAt
    ) {
      eventsInDocument.unshift(
        new Event(
          {
            id: RevisionHelper.latestId(document.id),
            name: "revisions.create",
            documentId: document.id,
            createdAt: document.updatedAt,
            actor: document.updatedBy,
          },
          events
        )
      );
    }

    return eventsInDocument;
  }, [eventsInDocument, events, document]);

  useKeyDown("Escape", onCloseHistory);

  return (
    <Sidebar title={t("History")} onClose={onCloseHistory}>
      {document ? (
        <PaginatedEventList
          aria-label={t("History")}
          fetch={events.fetchPage}
          events={items}
          options={{
            documentId: document.id,
          }}
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
