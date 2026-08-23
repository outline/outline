import isEqual from "fast-deep-equal";
import { orderBy } from "es-toolkit/compat";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";
import { Pagination } from "@shared/constants";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import Revision from "~/models/Revision";
import Empty from "~/components/Empty";
import PaginatedEventList from "./PaginatedEventList";
import {
  COMPARE_TO_PREVIOUS,
  HighlightChangesControl,
} from "./HighlightChangesControl";
import useKeyDown from "~/hooks/useKeyDown";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { notePath, matchNoteHistory } from "~/utils/routeHelpers";
import { isTruthyQueryValue } from "~/utils/urls";
import Sidebar from "../SidebarLayout";
import useMobile from "~/hooks/useMobile";
import usePersistedState from "~/hooks/usePersistedState";
import Scrollable from "~/components/Scrollable";
import Flex from "@shared/components/Flex";
const NoteEvents = [
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
  const { events, notes, revisions } = useStores();
  const { t } = useTranslation();
  const match = useRouteMatch<{
    noteSlug: string;
  }>();
  const historyMatch = useRouteMatch<{
    revisionId?: string;
  }>({
    path: matchNoteHistory,
  });
  const history = useHistory();
  const query = useQuery();
  const sidebarContext = useLocationSidebarContext();
  const note = notes.get(match.params.noteSlug);
  const [revisionsOffset, setRevisionsOffset] = React.useState(0);
  const [eventsOffset, setEventsOffset] = React.useState(0);
  const isMobile = useMobile();
  const [compareTo, setCompareTo] = React.useState(
    () => query.get("compareTo") ?? COMPARE_TO_PREVIOUS
  );
  const [defaultShowChanges, setDefaultShowChanges] =
    usePersistedState<boolean>("history-show-changes", true);
  const searchParams = new URLSearchParams(history.location.search);
  const [showChanges, setShowChanges] = React.useState(
    isTruthyQueryValue(searchParams.get("changes")) || defaultShowChanges
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
    [updateLocation, setDefaultShowChanges]
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
  }, [defaultShowChanges, updateLocation]);
  const fetchHistory = React.useCallback(async () => {
    if (!note) {
      return [];
    }
    const limit = Pagination.defaultLimit;
    const [revisionsPage, eventsPage] = await Promise.all([
      revisions.fetchPage({
        noteId: note.id,
        offset: revisionsOffset,
        limit,
      }),
      events.fetchPage({
        events: NoteEvents,
        noteId: note.id,
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
  }, [note, revisions, events, revisionsOffset, eventsOffset]);
  const revisionEvents = React.useMemo(() => {
    if (!note) {
      return [];
    }
    const latestRevisionId = RevisionHelper.latestId(note.id);
    return revisions
      .getByNoteId(note.id)
      .filter((revision: Revision) => revision.id !== latestRevisionId)
      .slice(0, revisionsOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, revisions.orderedData, revisionsOffset]);
  // The revisions list is lightweight and omits note content, so load the
  // content of the latest revision on demand to compare it against the current
  // note below.
  const latestRevisionEvent = revisionEvents[0];
  const latestRevision = latestRevisionEvent
    ? revisions.get(latestRevisionEvent.id)
    : undefined;
  React.useEffect(() => {
    if (latestRevision && !latestRevision.data) {
      void revisions.fetch(latestRevision.id);
    }
  }, [revisions, latestRevision]);
  // Whether the current note has unsaved changes beyond its latest
  // revision, in which case a "Current version" entry is shown. Computed in the
  // render body (rather than the memo below) so the observer re-evaluates it
  // once the lazily-loaded revision content arrives. The content-aware check is
  // deferred until the content has loaded to avoid showing an entry that would
  // then vanish.
  const isDocUpdated =
    !!latestRevision &&
    !!note &&
    (latestRevision.title !== note.title ||
      (!!latestRevision.data && !isEqual(latestRevision.data, note.data)));
  const nonRevisionEvents = React.useMemo(
    () => (note ? events.getByNoteId(note.id).slice(0, eventsOffset) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [note, events.orderedData, eventsOffset]
  );
  const items = React.useMemo(() => {
    const merged = orderBy(
      [...revisionEvents, ...nonRevisionEvents],
      "createdAt",
      "desc"
    );
    if (isDocUpdated && note) {
      const createdById = note.updatedBy?.id ?? "";
      merged.unshift(
        new Revision(
          {
            id: RevisionHelper.latestId(note.id),
            createdAt: note.updatedAt,
            createdById,
            collaboratorIds: [createdById],
          },
          revisions
        )
      );
    }
    return merged;
  }, [revisions, note, revisionEvents, nonRevisionEvents, isDocUpdated]);
  const onCloseHistory = React.useCallback(() => {
    if (isMobile) {
      // Allow closing the history drawer on mobile to view revision content
      return;
    }
    if (note) {
      history.push({
        pathname: notePath(note),
        state: { sidebarContext },
      });
    } else {
      history.goBack();
    }
  }, [history, note, sidebarContext, isMobile]);
  useKeyDown("Escape", onCloseHistory);
  return (
    <Sidebar title={t("History")} onClose={onCloseHistory} scrollable={false}>
      <HighlightChangesControl
        showChanges={showChanges}
        onShowChangesToggle={handleShowChangesToggle}
        items={items}
        note={note}
        selectedRevisionId={selectedRevisionId}
        compareTo={compareTo}
        onCompareToChange={handleCompareToChange}
      />
      <Scrollable hiddenScrollbars topShadow>
        {note ? (
          <PaginatedEventList
            aria-label={t("History")}
            fetch={fetchHistory}
            items={items}
            note={note}
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
export default observer(History);
