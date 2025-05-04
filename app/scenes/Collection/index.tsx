import { observer } from "mobx-react";
import * as React from "react";
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
import breakpoint from "styled-components-breakpoint";
import Icon, { IconTitleWrapper } from "@shared/components/Icon";
import { s } from "@shared/styles";
import { StatusFilter } from "@shared/types";
import { colorPalette } from "@shared/utils/collections";
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
import Tab from "~/components/Tab";
import Tabs from "~/components/Tabs";
import { editCollection } from "~/actions/definitions/collections";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import { useLastVisitedPath } from "~/hooks/useLastVisitedPath";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePersistedState from "~/hooks/usePersistedState";
import { usePinnedDocuments } from "~/hooks/usePinnedDocuments";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { collectionPath, updateCollectionPath } from "~/utils/routeHelpers";
import Error404 from "../Errors/Error404";
import Actions from "./components/Actions";
import DropToImport from "./components/DropToImport";
import Empty from "./components/Empty";
import MembershipPreview from "./components/MembershipPreview";
import Notices from "./components/Notices";
import Overview from "./components/Overview";
import ShareButton from "./components/ShareButton";

const IconPicker = React.lazy(() => import("~/components/IconPicker"));

enum CollectionPath {
  Overview = "overview",
  Recent = "recent",
  Updated = "updated",
  Published = "published",
  Old = "old",
  Alphabetical = "alphabetical",
}

const CollectionScene = observer(function _CollectionScene() {
  const params = useParams<{ id?: string }>();
  const history = useHistory();
  const match = useRouteMatch();
  const location = useLocation();
  const { t } = useTranslation();
  const { documents, collections, ui } = useStores();
  const [error, setError] = React.useState<Error | undefined>();
  const currentPath = location.pathname;
  const [, setLastVisitedPath] = useLastVisitedPath();
  const sidebarContext = useLocationSidebarContext();

  const id = params.id || "";
  const urlId = id.split("-").pop() ?? "";

  const collection: Collection | null | undefined =
    collections.getByUrl(id) || collections.get(id);
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

  const handleIconChange = React.useCallback(
    (icon: string | null, color: string | null) =>
      collection?.save({ icon, color }),
    [collection]
  );

  React.useEffect(() => {
    setLastVisitedPath(currentPath);
  }, [currentPath, setLastVisitedPath]);

  React.useEffect(() => {
    if (collection?.name) {
      const canonicalUrl = updateCollectionPath(match.url, collection);

      if (match.url !== canonicalUrl) {
        history.replace(canonicalUrl, history.location.state);
      }
    }
  }, [collection, collection?.name, history, id, match.url]);

  React.useEffect(() => {
    if (collection) {
      ui.setActiveCollection(collection.id);
    }

    return () => ui.setActiveCollection(undefined);
  }, [ui, collection]);

  React.useEffect(() => {
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

  useCommandBarActions([editCollection], [ui.activeCollectionId ?? "none"]);

  if (!collection && error) {
    return <Error404 />;
  }

  const hasOverview = can.update || collection?.hasDescription;

  const fallbackIcon = collection ? (
    <Icon
      value={collection.icon ?? "collection"}
      color={collection.color || undefined}
      size={40}
    />
  ) : null;

  const tabProps = (path: CollectionPath) => ({
    exact: true,
    onClick: () => setCollectionTab(path),
    to: {
      pathname: collectionPath(collection!.path, path),
      state: { sidebarContext },
    },
  });

  return collection ? (
    <Scene
      centered={false}
      textTitle={collection.name}
      left={
        collection.isArchived ? (
          <CollectionBreadcrumb collection={collection} />
        ) : collection.isEmpty ? undefined : (
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
        accept={documents.importFileTypes.join(", ")}
        disabled={!can.createDocument}
        collectionId={collection.id}
      >
        <CenteredContent withStickyHeader>
          <Notices collection={collection} />
          <CollectionHeading>
            <IconTitleWrapper>
              {can.update ? (
                <React.Suspense fallback={fallbackIcon}>
                  <IconPicker
                    icon={collection.icon ?? "collection"}
                    color={collection.color ?? colorPalette[0]}
                    initial={collection.name[0]}
                    size={40}
                    popoverPosition="bottom-start"
                    onChange={handleIconChange}
                    borderOnHover
                  />
                </React.Suspense>
              ) : (
                fallbackIcon
              )}
            </IconTitleWrapper>
            {collection.name}
          </CollectionHeading>

          <PinnedDocuments
            pins={pins}
            canUpdate={can.update}
            placeholderCount={count}
          />

          <Documents>
            <Tabs>
              {hasOverview && (
                <Tab {...tabProps(CollectionPath.Overview)}>
                  {t("Overview")}
                </Tab>
              )}
              <Tab {...tabProps(CollectionPath.Recent)}>{t("Documents")}</Tab>
              {!collection.isArchived && (
                <>
                  <Tab {...tabProps(CollectionPath.Updated)}>
                    {t("Recently updated")}
                  </Tab>
                  <Tab {...tabProps(CollectionPath.Published)}>
                    {t("Recently published")}
                  </Tab>
                  <Tab {...tabProps(CollectionPath.Old)}>
                    {t("Least recently updated")}
                  </Tab>
                  <Tab {...tabProps(CollectionPath.Alphabetical)}>
                    {t("A–Z")}
                  </Tab>
                </>
              )}
            </Tabs>
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
                {hasOverview ? (
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
          </Documents>
        </CenteredContent>
      </DropToImport>
    </Scene>
  ) : (
    <CenteredContent>
      <Heading>
        <PlaceholderText height={35} />
      </Heading>
      <PlaceholderList count={5} />
    </CenteredContent>
  );
});

const KeyedCollection = () => {
  const params = useParams<{ id?: string }>();

  // Forced mount prevents animation of pinned documents when navigating
  // _between_ collections, speeds up perceived performance.
  return <CollectionScene key={params.id} />;
};

const Documents = styled.div`
  position: relative;
  background: ${s("background")};
`;

const CollectionHeading = styled(Heading)`
  display: flex;
  align-items: center;
  position: relative;
  margin-left: 40px;

  ${breakpoint("tablet")`
    margin-left: 0;
  `}
`;

export default KeyedCollection;
