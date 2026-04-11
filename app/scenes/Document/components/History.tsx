import { format as formatDate } from "date-fns";
import isEqual from "fast-deep-equal";
import { dateLocale } from "@shared/utils/date";
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
import { InputSelect, type Option } from "~/components/InputSelect";
import PaginatedEventList from "~/components/PaginatedEventList";
import useKeyDown from "~/hooks/useKeyDown";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import { documentPath, matchDocumentHistory } from "~/utils/routeHelpers";
import Sidebar from "./SidebarLayout";
import useMobile from "~/hooks/useMobile";
import Switch from "~/components/Switch";
import Text from "@shared/components/Text";
import usePersistedState from "~/hooks/usePersistedState";
import Scrollable from "~/components/Scrollable";
import Flex from "@shared/components/Flex";

const COMPARE_TO_PREVIOUS = "previous";

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
  const historyMatch = useRouteMatch<{ revisionId?: string }>({
    path: matchDocumentHistory,
  });
  const history = useHistory();
  const query = useQuery();
  const sidebarContext = useLocationSidebarContext();
  const document = documents.get(match.params.documentSlug);
  const [revisionsOffset, setRevisionsOffset] = React.useState(0);
  const [eventsOffset, setEventsOffset] = React.useState(0);
  const isMobile = useMobile();
  const userLocale = useUserLocale();
  const [compareTo, setCompareTo] = React.useState(
    () => query.get("compareTo") ?? COMPARE_TO_PREVIOUS
  );

  const [defaultShowChanges, setDefaultShowChanges] =
    usePersistedState<boolean>("history-show-changes", true);

  const searchParams = new URLSearchParams(history.location.search);
  const [showChanges, setShowChanges] = React.useState(
    searchParams.get("changes") === "true" || defaultShowChanges
  );

  const updateLocation = React.useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(history.location.search);

      Object.entries(changes).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const search = params.toString();
      history.replace({
        pathname: history.location.pathname,
        search: search ? `?${search}` : "",
        state: history.location.state,
      });
    },
    [history]
  );

  // Handler for toggling the "Show Changes" switch, updating state and URL parameter
  const handleShowChangesToggle = React.useCallback(
    (checked: boolean) => {
      setShowChanges(checked);
      setDefaultShowChanges(checked);
      if (checked) {
        updateLocation({ changes: "true" });
      } else {
        setCompareTo(COMPARE_TO_PREVIOUS);
        updateLocation({ changes: null, compareTo: null });
      }
    },
    [updateLocation]
  );

  const selectedRevisionId = historyMatch?.params.revisionId;

  // Reset "Compare to" when the user clicks a different revision in the list,
  // but not on initial mount (which would break deep links with ?compareTo=…)
  const prevSelectedRef = React.useRef(selectedRevisionId);
  React.useEffect(() => {
    if (prevSelectedRef.current !== selectedRevisionId) {
      prevSelectedRef.current = selectedRevisionId;
      setCompareTo(COMPARE_TO_PREVIOUS);
      updateLocation({ compareTo: null });
    }
  }, [selectedRevisionId, updateLocation]);

  const handleCompareToChange = React.useCallback(
    (value: string) => {
      setCompareTo(value);
      updateLocation({
        compareTo: value === COMPARE_TO_PREVIOUS ? null : value,
      });
    },
    [updateLocation]
  );

  // Ensure that the URL parameter is in sync with the persisted state on mount
  React.useEffect(() => {
    if (defaultShowChanges) {
      updateLocation({ changes: "true" });
    }
  }, [defaultShowChanges]);

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

  const compareOptions = React.useMemo((): Option[] => {
    const revisionItems = items.filter(
      (item): item is Revision => item instanceof Revision
    );

    const locale = dateLocale(userLocale);
    const resolvedSelectedId =
      selectedRevisionId === "latest" && document
        ? RevisionHelper.latestId(document.id)
        : selectedRevisionId;

    const options: Option[] = [
      { type: "item", label: t("Previous revision"), value: COMPARE_TO_PREVIOUS },
    ];

    const latestId = document ? RevisionHelper.latestId(document.id) : undefined;

    for (const rev of revisionItems) {
      if (rev.id === resolvedSelectedId) {
        continue;
      }

      const dateLabel = formatDate(
        new Date(rev.createdAt),
        "MMM do, h:mm a",
        { locale }
      );
      const collaboratorName =
        rev.collaborators?.[0]?.name ?? rev.createdBy?.name;

      options.push({
        type: "item",
        label: dateLabel,
        value: rev.id === latestId ? "latest" : rev.id,
        description: collaboratorName
          ? t("{{userName}} edited", { userName: collaboratorName })
          : undefined,
      });
    }

    return options;
  }, [items, selectedRevisionId, document, userLocale, t]);

  const onCloseHistory = React.useCallback(() => {
    if (isMobile) {
      // Allow closing the history drawer on mobile to view revision content
      return;
    }
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
    <Sidebar title={t("History")} onClose={onCloseHistory} scrollable={false}>
      <Content>
        <Text type="secondary" size="small" as="span">
          <Switch
            label={t("Highlight changes")}
            checked={showChanges}
            onChange={handleShowChangesToggle}
          />
        </Text>
        {showChanges && (
          <CompareToWrapper>
            <InputSelect
              options={compareOptions}
              value={compareTo}
              onChange={handleCompareToChange}
              label={t("Compare to")}
              short
            />
          </CompareToWrapper>
        )}
      </Content>
      <Scrollable hiddenScrollbars topShadow>
        {document ? (
          <PaginatedEventList
            aria-label={t("History")}
            fetch={fetchHistory}
            items={items}
            document={document}
            empty={
              <Flex
                align="center"
                justify="center"
                style={{
                  // When there are no items, drawer renders with a minimum height
                  // and that height is retained when items are fetched and re-rendered.
                  // To circumvent this, we force some `minHeight` here.
                  minHeight: isMobile ? "70vh" : undefined,
                  height: "100%",
                }}
                auto
              >
                <Empty>{t("No history yet")}</Empty>
              </Flex>
            }
          />
        ) : null}
      </Scrollable>
    </Sidebar>
  );
}

const Content = styled.div`
  margin: 0 16px 8px;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 8px;
  padding: 8px 8px 0;
  flex-shrink: 0;
`;

const CompareToWrapper = styled.div`
  padding: 4px 0 8px;
`;

export default observer(History);
