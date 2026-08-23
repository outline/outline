import { observer } from "mobx-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  useParams,
  Switch,
  Route,
  useHistory,
  useRouteMatch,
  useLocation,
  Redirect,
} from "react-router-dom";
import styled from "styled-components";
import { toError } from "@shared/utils/error";
import { s } from "@shared/styles";
import { StatusFilter } from "@shared/types";
import type Notebook from "~/models/Notebook";
import type NotesStore from "~/stores/NotesStore";
import CenteredContent from "~/components/CenteredContent";
import { NotebookBreadcrumb } from "~/components/NotebookBreadcrumb";
import Heading from "~/components/Heading";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import InputSearchPage from "~/components/InputSearchPage";
import PlaceholderList from "~/components/List/Placeholder";
import PaginatedNoteList from "~/components/PaginatedNoteList";
import PinnedNotes from "~/components/PinnedNotes";
import PlaceholderText from "~/components/PlaceholderText";
import Scene from "~/components/Scene";
import { editNotebook } from "~/actions/definitions/notebooks";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import { useTrackLastVisitedPath } from "~/hooks/useLastVisitedPath";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import { usePinnedNotes } from "~/hooks/usePinnedNotes";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { NotFoundError } from "~/utils/errors";
import {
  notebookEditPath,
  notebookPath,
  matchNotebookEdit,
  updateNotebookPath,
} from "~/utils/routeHelpers";
import Error404 from "../Errors/Error404";
import Actions from "./components/Actions";
import DropToImport from "./components/DropToImport";
import Empty from "./components/Empty";
import MembershipPreview from "./components/MembershipPreview";
import Navigation, { NotebookTab } from "./components/Navigation";
import Notices from "./components/Notices";
import Overview from "./components/Overview";
import { Header } from "./components/Header";
import usePersistedState from "~/hooks/usePersistedState";
import useCurrentUser from "~/hooks/useCurrentUser";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
const NotebookScene = observer(function NotebookScene_() {
  const params = useParams<{
    notebookSlug?: string;
  }>();
  const history = useHistory();
  const match = useRouteMatch();
  const location = useLocation();
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { notes, notebooks, shares, ui } = useStores();
  const [error, setError] = useState<Error | undefined>();
  const currentPath = location.pathname;
  useTrackLastVisitedPath(currentPath);
  const sidebarContext = useLocationSidebarContext();
  const isEditRoute = match.path === matchNotebookEdit;
  const id = params.notebookSlug || "";
  const urlId = id.split("-").pop() ?? "";
  const notebook = notebooks.get(id);
  const can = usePolicy(notebook);
  const hasDescription = notebook?.data
    ? !ProsemirrorDataHelper.isEmpty(notebook.data)
    : false;
  const { pins, count } = usePinnedNotes(urlId, notebook?.id);
  const [notebookTab, setNotebookTab] = usePersistedState<NotebookTab>(
    `collection-tab:${notebook?.id}`,
    hasDescription ? NotebookTab.Overview : NotebookTab.Recent,
    {
      listen: false,
    }
  );
  useEffect(() => {
    if (notebook?.name) {
      const canonicalUrl = updateNotebookPath(match.url, notebook);
      if (match.url !== canonicalUrl) {
        history.replace(canonicalUrl, history.location.state);
      }
    }
  }, [notebook, notebook?.name, history, id, match.url]);
  useEffect(() => {
    if (notebook) {
      ui.setActiveNotebook(notebook.id);
    }
    return () => ui.setActiveNotebook(undefined);
  }, [ui, notebook]);
  useEffect(() => {
    async function fetchData() {
      try {
        setError(undefined);
        await notebooks.fetch(id);
      } catch (err) {
        setError(toError(err));
      }
    }
    void fetchData();
    // Fetched once on mount, the slug in `id` also changes when the collection
    // is renamed which must not trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (notebook) {
      shares.fetchOne({ notebookId: notebook.id }).catch((err) => {
        if (!(err instanceof NotFoundError)) {
          throw err;
        }
      });
    }
  }, [shares, notebook]);
  useCommandBarActions([editNotebook], [ui.activeNotebookId ?? "none"]);
  if (!notebook && error) {
    return <Error404 />;
  }
  if (!notebook) {
    return <Loading />;
  }
  const showOverview = can.update || hasDescription;
  return (
    <Scene
      centered={false}
      textTitle={notebook.name}
      left={
        notebook.isArchived ? (
          <NotebookBreadcrumb notebook={notebook} />
        ) : (
          <InputSearchPage
            source="collection"
            placeholder={`${t("Search in notebook")}…`}
            label={t("Search in notebook")}
            notebookId={notebook.id}
          />
        )
      }
      title={
        <>
          <CollectionIcon notebook={notebook} expanded />
          &nbsp;{notebook.name}
        </>
      }
      actions={
        <>
          <MembershipPreview notebook={notebook} />
          <Actions
            notebook={notebook}
            isEditing={isEditRoute}
            sidebarContext={sidebarContext}
          />
        </>
      }
    >
      <DropToImport
        accept={notes.importFileTypesString}
        disabled={!can.createNote}
        notebookId={notebook.id}
      >
        <CenteredContent withStickyHeader>
          <Notices notebook={notebook} />
          <Header
            notebook={notebook}
            isEditing={isEditRoute || !user?.separateEditMode}
          />

          <PinnedNotes pins={pins} placeholderCount={count} />

          <Content>
            <Navigation
              notebook={notebook}
              onChangeTab={setNotebookTab}
              showOverview={showOverview}
              sidebarContext={sidebarContext}
            />
            <Switch>
              <Route path={notebookPath(notebook)} exact>
                <Redirect
                  to={{
                    pathname: notebookPath(notebook!, notebookTab),
                    state: { sidebarContext },
                  }}
                />
              </Route>
              <Route
                path={[
                  notebookPath(notebook, NotebookTab.Overview),
                  notebookEditPath(notebook),
                ]}
              >
                {showOverview ? (
                  <Overview
                    notebook={notebook}
                    readOnly={
                      !can.update || (!isEditRoute && !!user?.separateEditMode)
                    }
                  />
                ) : (
                  <Redirect
                    to={{
                      pathname: notebookPath(notebook, NotebookTab.Recent),
                      state: { sidebarContext },
                    }}
                  />
                )}
              </Route>
              {notebook.isEmpty ? (
                <Empty notebook={notebook} />
              ) : !notebook.isArchived ? (
                <>
                  <Route
                    path={notebookPath(notebook, NotebookTab.Alphabetical)}
                  >
                    <PaginatedNoteList
                      key="alphabetical"
                      notes={notes.alphabeticalInNotebook(notebook.id)}
                      fetch={notes.fetchAlphabetical}
                      options={{
                        notebookId: notebook.id,
                      }}
                    />
                  </Route>
                  <Route path={notebookPath(notebook, NotebookTab.Old)}>
                    <PaginatedNoteList
                      key="old"
                      notes={notes.leastRecentlyUpdatedInNotebook(notebook.id)}
                      fetch={notes.fetchLeastRecentlyUpdated}
                      options={{
                        notebookId: notebook.id,
                      }}
                    />
                  </Route>
                  <Route path={notebookPath(notebook, NotebookTab.Published)}>
                    <PaginatedNoteList
                      key="published"
                      notes={notes.recentlyPublishedInNotebook(notebook.id)}
                      fetch={notes.fetchRecentlyPublished}
                      options={{
                        notebookId: notebook.id,
                      }}
                      showPublished
                    />
                  </Route>
                  <Route path={notebookPath(notebook, NotebookTab.Updated)}>
                    <PaginatedNoteList
                      key="updated"
                      notes={notes.recentlyUpdatedInNotebook(notebook.id)}
                      fetch={notes.fetchRecentlyUpdated}
                      options={{
                        notebookId: notebook.id,
                      }}
                    />
                  </Route>
                  <Route path={notebookPath(notebook, NotebookTab.Popular)}>
                    <PaginatedNoteList
                      key="popular"
                      notes={notes.popularInNotebook(notebook.id)}
                      fetch={notes.fetchPopular}
                      options={{
                        notebookId: notebook.id,
                      }}
                    />
                  </Route>
                  <Route
                    path={notebookPath(notebook, NotebookTab.Recent)}
                    exact
                  >
                    <RecentNotes notebook={notebook} notes={notes} />
                  </Route>
                </>
              ) : (
                <Route path={notebookPath(notebook, NotebookTab.Recent)} exact>
                  <PaginatedNoteList
                    notes={notes.archivedInNotebook(notebook.id)}
                    fetch={notes.fetchPage}
                    options={{
                      notebookId: notebook.id,
                      parentNoteId: null,
                      sort: notebook.sort.field,
                      direction: notebook.sort.direction,
                      statusFilter: [StatusFilter.Archived],
                    }}
                    showParentNotes
                  />
                </Route>
              )}
            </Switch>
          </Content>
        </CenteredContent>
      </DropToImport>
    </Scene>
  );
});
const Loading = () => (
  <CenteredContent>
    <Heading>
      <PlaceholderText height={35} />
    </Heading>
    <PlaceholderList count={5} />
  </CenteredContent>
);
const KeyedNotebook = () => {
  const params = useParams<{
    id?: string;
  }>();
  // Forced mount prevents animation of pinned documents when navigating
  // _between_ collections, speeds up perceived performance.
  return <NotebookScene key={params.id} />;
};
const Content = styled.div`
  position: relative;
  background: ${s("background")};
`;
const RecentNotes = observer(
  ({ notebook, notes }: { notebook: Notebook; notes: NotesStore }) => {
    useEffect(() => {
      void notebook.fetchNotes();
    }, [notebook]);
    return (
      <PaginatedNoteList
        notes={notes.rootInNotebook(notebook.id)}
        fetch={notes.fetchPage}
        options={{
          notebookId: notebook.id,
          parentNoteId: null,
          sort: notebook.sort.field,
          direction: notebook.sort.direction,
        }}
        showParentNotes
      />
    );
  }
);
export default KeyedNotebook;
