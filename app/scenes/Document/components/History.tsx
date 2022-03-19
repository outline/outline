import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";
import Event from "~/models/Event";
import Empty from "~/components/Empty";
import PaginatedEventList from "~/components/PaginatedEventList";
import useStores from "~/hooks/useStores";
import { documentUrl } from "~/utils/routeHelpers";
import Sidebar from "./RightSidebar";

const EMPTY_ARRAY: Event[] = [];

function History() {
  const { events, documents } = useStores();
  const { t } = useTranslation();
  const match = useRouteMatch<{ documentSlug: string }>();
  const history = useHistory();
  const document = documents.getByUrl(match.params.documentSlug);

  const eventsInDocument = document
    ? events.inDocument(document.id)
    : EMPTY_ARRAY;

  const onCloseHistory = () => {
    if (document) {
      history.push(documentUrl(document));
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
            name: "documents.latest_version",
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

  return (
    <Sidebar title={t("History")} onClose={onCloseHistory}>
      {document && (
        <PaginatedEventList
          aria-label={t("History")}
          fetch={events.fetchPage}
          events={items}
          options={{
            documentId: document.id,
          }}
          document={document}
          empty={<Empty>{t("Oh weird, there's nothing here")}</Empty>}
        />
      )}
    </Sidebar>
  );
}

export default observer(History);
