import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  useParams,
  Redirect,
  Switch,
  Route,
  useHistory,
  useRouteMatch,
} from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Collection from "~/models/Collection";
import Search from "~/scenes/Search";
import Badge from "~/components/Badge";
import CenteredContent from "~/components/CenteredContent";
import CollectionDescription from "~/components/CollectionDescription";
import CollectionIcon from "~/components/CollectionIcon";
import Heading from "~/components/Heading";
import PlaceholderList from "~/components/List/Placeholder";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import PinnedDocuments from "~/components/PinnedDocuments";
import PlaceholderText from "~/components/PlaceholderText";
import Scene from "~/components/Scene";
import Star, { AnimatedStar } from "~/components/Star";
import Tab from "~/components/Tab";
import Tabs from "~/components/Tabs";
import Tooltip from "~/components/Tooltip";
import { editCollection } from "~/actions/definitions/collections";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { collectionUrl, updateCollectionUrl } from "~/utils/routeHelpers";
import Actions from "./Collection/Actions";
import DropToImport from "./Collection/DropToImport";
import Empty from "./Collection/Empty";

function CollectionScene() {
  const params = useParams<{ id?: string }>();
  const history = useHistory();
  const match = useRouteMatch();
  const { t } = useTranslation();
  const { documents, pins, collections, ui } = useStores();
  const [isFetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const id = params.id || "";
  const collection: Collection | null | undefined =
    collections.getByUrl(id) || collections.get(id);
  const can = usePolicy(collection?.id || "");

  React.useEffect(() => {
    if (collection?.name) {
      const canonicalUrl = updateCollectionUrl(match.url, collection);

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
    setError(undefined);

    if (collection) {
      pins.fetchPage({
        collectionId: collection.id,
      });
    }
  }, [pins, collection]);

  React.useEffect(() => {
    async function load() {
      if ((!can || !collection) && !error && !isFetching) {
        try {
          setError(undefined);
          setFetching(true);
          await collections.fetch(id);
        } catch (err) {
          setError(err);
        } finally {
          setFetching(false);
        }
      }
    }

    load();
  }, [collections, isFetching, collection, error, id, can]);

  useCommandBarActions(
    [editCollection],
    ui.activeCollectionId ? [ui.activeCollectionId] : undefined
  );

  if (!collection && error) {
    return <Search notFound />;
  }

  return collection ? (
    <Scene
      // Forced mount prevents animation of pinned documents when navigating
      // _between_ collections, speeds up perceived performance.
      key={collection.id}
      centered={false}
      textTitle={collection.name}
      title={
        <>
          <CollectionIcon collection={collection} expanded />
          &nbsp;{collection.name}
        </>
      }
      actions={<Actions collection={collection} />}
    >
      <DropToImport
        accept={documents.importFileTypes.join(", ")}
        disabled={!can.update}
        collectionId={collection.id}
      >
        <CenteredContent withStickyHeader>
          {collection.isEmpty ? (
            <Empty collection={collection} />
          ) : (
            <>
              <HeadingWithIcon $isStarred={collection.isStarred}>
                <HeadingIcon collection={collection} size={40} expanded />
                {collection.name}
                {!collection.permission && (
                  <Tooltip
                    tooltip={t(
                      "This collection is only visible to those given access"
                    )}
                    placement="bottom"
                  >
                    <Badge>{t("Private")}</Badge>
                  </Tooltip>
                )}
                <StarButton collection={collection} size={32} />
              </HeadingWithIcon>
              <CollectionDescription collection={collection} />

              <PinnedDocuments
                pins={pins.inCollection(collection.id)}
                canUpdate={can.update}
              />

              <Tabs>
                <Tab to={collectionUrl(collection.url)} exact>
                  {t("Documents")}
                </Tab>
                <Tab to={collectionUrl(collection.url, "updated")} exact>
                  {t("Recently updated")}
                </Tab>
                <Tab to={collectionUrl(collection.url, "published")} exact>
                  {t("Recently published")}
                </Tab>
                <Tab to={collectionUrl(collection.url, "old")} exact>
                  {t("Least recently updated")}
                </Tab>
                <Tab to={collectionUrl(collection.url, "alphabetical")} exact>
                  {t("A–Z")}
                </Tab>
              </Tabs>
              <Switch>
                <Route path={collectionUrl(collection.url, "alphabetical")}>
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
                <Route path={collectionUrl(collection.url, "old")}>
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
                <Route path={collectionUrl(collection.url, "recent")}>
                  <Redirect to={collectionUrl(collection.url, "published")} />
                </Route>
                <Route path={collectionUrl(collection.url, "published")}>
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
                <Route path={collectionUrl(collection.url, "updated")}>
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
                <Route path={collectionUrl(collection.url)} exact>
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
              </Switch>
            </>
          )}
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
}

const StarButton = styled(Star)`
  position: relative;
  top: 0;
  left: 10px;
  overflow: hidden;
  width: 24px;

  svg {
    position: relative;
    left: -4px;
  }
`;

const HeadingWithIcon = styled(Heading)<{ $isStarred: boolean }>`
  display: flex;
  align-items: center;

  ${AnimatedStar} {
    opacity: ${(props) => (props.$isStarred ? "1 !important" : 0)};
  }

  &:hover {
    ${AnimatedStar} {
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
    }
  }

  ${breakpoint("tablet")`
    margin-left: -40px;
  `};
`;

const HeadingIcon = styled(CollectionIcon)`
  align-self: flex-start;
  flex-shrink: 0;
`;

export default observer(CollectionScene);
