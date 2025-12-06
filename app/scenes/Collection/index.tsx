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
import { s } from "@shared/styles";
import { StatusFilter } from "@shared/types";
import Collection from "~/models/Collection";
import { Action } from "~/components/Actions";
import CenteredContent from "~/components/CenteredContent";
import { CollectionBreadcrumb } from "~/components/CollectionBreadcrumb";
import Heading from "~/components/Heading";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import InputSearchPage from "~/components/InputSearchPage";
import PlaceholderList from "~/components/List/Placeholder";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import PinnedDocuments from "~/components/PinnedDocuments";
import PlaceholderText from "~/components/PlaceholderText";
import Scene from "~/components/Scene";
import { editCollection } from "~/actions/definitions/collections";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import { useLastVisitedPath } from "~/hooks/useLastVisitedPath";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import { usePinnedDocuments } from "~/hooks/usePinnedDocuments";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { NotFoundError } from "~/utils/errors";
import { collectionPath, updateCollectionPath } from "~/utils/routeHelpers";
import Error404 from "../Errors/Error404";
import Actions from "./components/Actions";
import DropToImport from "./components/DropToImport";
import Empty from "./components/Empty";
import MembershipPreview from "./components/MembershipPreview";
import Navigation, { CollectionPath } from "./components/Navigation";
import Notices from "./components/Notices";
import Overview from "./components/Overview";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { Header } from "./components/Header";
import usePersistedState from "~/hooks/usePersistedState";

const ShareButton = lazyWithRetry(() => import("./components/ShareButton"));

const CollectionScene = observer(function _CollectionScene() {
  const params = useParams<{ id?: string }>();
  const history = useHistory();
  const match = useRouteMatch();
  const location = useLocation();
  const { t } = useTranslation();
  const { documents, collections, shares, ui } = useStores();
  const [error, setError] = useState<Error | undefined>();
  const currentPath = location.pathname;
  const [, setLastVisitedPath] = useLastVisitedPath();
  const sidebarContext = useLocationSidebarContext();

  const id = params.id || "";
  const urlId = id.split("-").pop() ?? "";

  const collection: Collection | null | undefined = collections.get(id);
  const can = usePolicy(collection);

  const { pins, count } = usePinnedDocuments(urlId, collection?.id);

  const [collectionTab, setCollectionTab] = usePersistedState<CollectionPath>(
    `collection-tab:${collection?.id}`,
    collection?.hasDescription
      ? CollectionPath.Overview
      : CollectionPath.Recent,
    {
      listen: false,
    }
  );

  useEffect(() => {
    setLastVisitedPath(currentPath);
  }, [currentPath, setLastVisitedPath]);

  useEffect(() => {
    if (collection?.name) {
      const canonicalUrl = updateCollectionPath(match.url, collection);

      if (match.url !== canonicalUrl) {
        history.replace(canonicalUrl, history.location.state);
      }
    }
  }, [collection, collection?.name, history, id, match.url]);

  useEffect(() => {
    if (collection) {
      ui.setActiveCollection(collection.id);
    }

    return () => ui.setActiveCollection(undefined);
  }, [ui, collection]);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(undefined);
        await collections.fetch(id);
      } catch (err) {
        setError(err);
      }
    }

    void fetchData();
  }, []);

  useEffect(() => {
    if (collection) {
      shares.fetchOne({ collectionId: collection.id }).catch((err) => {
        if (!(err instanceof NotFoundError)) {
          throw err;
        }
      });
    }
  }, [shares, collection]);

  useCommandBarActions([editCollection], [ui.activeCollectionId ?? "none"]);

  if (!collection && error) {
    return <Error404 />;
  }
  if (!collection) {
    return <Loading />;
  }

  const showOverview = can.update || collection?.hasDescription;

  return (
    <Scene
      centered={false}
      textTitle={collection.name}
      left={
        collection.isArchived ? (
          <CollectionBreadcrumb collection={collection} />
        ) : (
          <InputSearchPage
            source="collection"
            placeholder={`${t("Search in collection")}…`}
            label={t("Search in collection")}
            collectionId={collection.id}
          />
        )
      }
      title={
        <>
          <CollectionIcon collection={collection} expanded />
          &nbsp;{collection.name}
        </>
      }
      actions={
        <>
          <MembershipPreview collection={collection} />
          <Action>
            {can.update && <ShareButton collection={collection} />}
          </Action>
          <Actions collection={collection} />
        </>
      }
    >
      <DropToImport
        accept={documents.importFileTypesString}
        disabled={!can.createDocument}
        collectionId={collection.id}
      >
        <CenteredContent withStickyHeader>
          <Notices collection={collection} />
          <Header collection={collection} />

          <PinnedDocuments
            pins={pins}
            canUpdate={can.update}
            placeholderCount={count}
          />

          <Content>
            <Navigation
              collection={collection}
              onChangeTab={setCollectionTab}
              showOverview={showOverview}
              sidebarContext={sidebarContext}
            />
            <Switch>
              <Route path={collectionPath(collection.path)} exact>
                <Redirect
                  to={{
                    pathname: collectionPath(collection!.path, collectionTab),
                    state: { sidebarContext },
                  }}
                />
              </Route>
              <Route
                path={collectionPath(collection.path, CollectionPath.Overview)}
              >
                {showOverview ? (
                  <Overview collection={collection} />
                ) : (
                  <Redirect
                    to={{
                      pathname: collectionPath(
                        collection.path,
                        CollectionPath.Recent
                      ),
                      state: { sidebarContext },
                    }}
                  />
                )}
              </Route>
              {collection.isEmpty ? (
                <Empty collection={collection} />
              ) : !collection.isArchived ? (
                <>
                  <Route
                    path={collectionPath(
                      collection.path,
                      CollectionPath.Alphabetical
                    )}
                  >
                    <PaginatedDocumentList
                      key="alphabetical"
                      documents={documents.alphabeticalInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchAlphabetical}
                      options={{
                        collectionId: collection.id,
                      }}
                    />
                  </Route>
                  <Route
                    path={collectionPath(collection.path, CollectionPath.Old)}
                  >
                    <PaginatedDocumentList
                      key="old"
                      documents={documents.leastRecentlyUpdatedInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchLeastRecentlyUpdated}
                      options={{
                        collectionId: collection.id,
                      }}
                    />
                  </Route>
                  <Route
                    path={collectionPath(
                      collection.path,
                      CollectionPath.Published
                    )}
                  >
                    <PaginatedDocumentList
                      key="published"
                      documents={documents.recentlyPublishedInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchRecentlyPublished}
                      options={{
                        collectionId: collection.id,
                      }}
                      showPublished
                    />
                  </Route>
                  <Route
                    path={collectionPath(
                      collection.path,
                      CollectionPath.Updated
                    )}
                  >
                    <PaginatedDocumentList
                      key="updated"
                      documents={documents.recentlyUpdatedInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchRecentlyUpdated}
                      options={{
                        collectionId: collection.id,
                      }}
                    />
                  </Route>
                  <Route
                    path={collectionPath(
                      collection.path,
                      CollectionPath.Popular
                    )}
                  >
                    <PaginatedDocumentList
                      key="popular"
                      documents={documents.popularInCollection(collection.id)}
                      fetch={documents.fetchPopular}
                      options={{
                        collectionId: collection.id,
                      }}
                    />
                  </Route>
                  <Route
                    path={collectionPath(
                      collection.path,
                      CollectionPath.Recent
                    )}
                    exact
                  >
                    <PaginatedDocumentList
                      documents={documents.rootInCollection(collection.id)}
                      fetch={documents.fetchPage}
                      options={{
                        collectionId: collection.id,
                        parentDocumentId: null,
                        sort: collection.sort.field,
                        direction: collection.sort.direction,
                      }}
                      showParentDocuments
                    />
                  </Route>
                </>
              ) : (
                <Route
                  path={collectionPath(collection.path, CollectionPath.Recent)}
                  exact
                >
                  <PaginatedDocumentList
                    documents={documents.archivedInCollection(collection.id)}
                    fetch={documents.fetchPage}
                    options={{
                      collectionId: collection.id,
                      parentDocumentId: null,
                      sort: collection.sort.field,
                      direction: collection.sort.direction,
                      statusFilter: [StatusFilter.Archived],
                    }}
                    showParentDocuments
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

const KeyedCollection = () => {
  const params = useParams<{ id?: string }>();

  // Forced mount prevents animation of pinned documents when navigating
  // _between_ collections, speeds up perceived performance.
  return <CollectionScene key={params.id} />;
};

const Content = styled.div`
  position: relative;
  background: ${s("background")};
`;

export default KeyedCollection;
