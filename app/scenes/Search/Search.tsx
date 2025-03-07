import { observer } from "mobx-react";
import queryString from "query-string";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation, useRouteMatch } from "react-router-dom";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { v4 as uuidv4 } from "uuid";
import { Pagination } from "@shared/constants";
import { hideScrollbars } from "@shared/styles";
import {
  DateFilter as TDateFilter,
  StatusFilter as TStatusFilter,
} from "@shared/types";
import ArrowKeyNavigation from "~/components/ArrowKeyNavigation";
import DocumentListItem from "~/components/DocumentListItem";
import Empty from "~/components/Empty";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import LoadingIndicator from "~/components/LoadingIndicator";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { SearchResult } from "~/types";
import { searchPath } from "~/utils/routeHelpers";
import { decodeURIComponentSafe } from "~/utils/urls";
import CollectionFilter from "./components/CollectionFilter";
import DateFilter from "./components/DateFilter";
import { DocumentFilter } from "./components/DocumentFilter";
import DocumentTypeFilter from "./components/DocumentTypeFilter";
import RecentSearches from "./components/RecentSearches";
import SearchInput from "./components/SearchInput";
import UserFilter from "./components/UserFilter";

type Props = { notFound?: boolean };

function Search(props: Props) {
  const { t } = useTranslation();
  const { documents, searches } = useStores();

  // routing
  const params = useQuery();
  const location = useLocation();
  const history = useHistory();
  const routeMatch = useRouteMatch<{ term: string }>();

  // refs
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const resultListRef = React.useRef<HTMLDivElement | null>(null);
  const recentSearchesRef = React.useRef<HTMLDivElement | null>(null);

  // filters
  const decodedQuery = decodeURIComponentSafe(
    routeMatch.params.term ?? params.get("query") ?? ""
  ).trim();
  const query = decodedQuery !== "" ? decodedQuery : undefined;
  const collectionId = params.get("collectionId") ?? "";
  const userId = params.get("userId") ?? "";
  const documentId = params.get("documentId") ?? undefined;
  const dateFilter = (params.get("dateFilter") as TDateFilter) ?? "";
  const statusFilter = params.getAll("statusFilter")?.length
    ? (params.getAll("statusFilter") as TStatusFilter[])
    : [TStatusFilter.Published, TStatusFilter.Draft];
  const titleFilter = params.get("titleFilter") === "true";

  const isSearchable = !!(query || collectionId || userId);

  const document = documentId ? documents.get(documentId) : undefined;

  const filterVisibility = {
    document: !!document,
    collection: !document,
    user: !document || !!(document && query),
    documentType: isSearchable,
    date: isSearchable,
    title: !!query && !document,
  };

  const filters = React.useMemo(
    () => ({
      query,
      statusFilter,
      collectionId,
      userId,
      dateFilter,
      titleFilter,
      documentId,
    }),
    [
      query,
      JSON.stringify(statusFilter),
      collectionId,
      userId,
      dateFilter,
      titleFilter,
      documentId,
    ]
  );

  const requestFn = React.useMemo(() => {
    // Add to the searches store so this search can immediately appear in the recent searches list
    // without a flash of loading.
    if (query) {
      searches.add({
        id: uuidv4(),
        query,
        createdAt: new Date().toISOString(),
      });
    }

    if (isSearchable) {
      return async () =>
        titleFilter
          ? await documents.searchTitles(filters)
          : await documents.search(filters);
    }

    return () => Promise.resolve([] as SearchResult[]);
  }, [query, titleFilter, filters, searches, documents, isSearchable]);

  const { data, next, end, error, loading } = usePaginatedRequest(requestFn, {
    limit: Pagination.defaultLimit,
  });

  const updateLocation = (query: string) => {
    history.replace({
      pathname: searchPath(query),
      search: queryString.stringify(
        { ...queryString.parse(location.search), query: undefined },
        {
          skipEmptyString: true,
        }
      ),
    });
  };

  // All filters go through the query string so that searches are bookmarkable, which neccesitates
  // some complexity as the query string is the source of truth for the filters.
  const handleFilterChange = (search: {
    collectionId?: string | undefined;
    documentId?: string | undefined;
    userId?: string | undefined;
    dateFilter?: TDateFilter;
    statusFilter?: TStatusFilter[];
    titleFilter?: boolean | undefined;
  }) => {
    history.replace({
      pathname: location.pathname,
      search: queryString.stringify(
        { ...queryString.parse(location.search), query: undefined, ...search },
        {
          skipEmptyString: true,
        }
      ),
    });
  };

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter") {
      updateLocation(ev.currentTarget.value);
      return;
    }

    if (ev.key === "Escape") {
      ev.preventDefault();
      return history.goBack();
    }

    if (ev.key === "ArrowUp") {
      if (ev.currentTarget.value) {
        const length = ev.currentTarget.value.length;
        const selectionEnd = ev.currentTarget.selectionEnd || 0;
        if (selectionEnd === 0) {
          ev.currentTarget.selectionStart = 0;
          ev.currentTarget.selectionEnd = length;
          ev.preventDefault();
        }
      }
    }

    if (ev.key === "ArrowDown" && !ev.shiftKey) {
      ev.preventDefault();

      if (ev.currentTarget.value) {
        const length = ev.currentTarget.value.length;
        const selectionStart = ev.currentTarget.selectionStart || 0;
        if (selectionStart < length) {
          ev.currentTarget.selectionStart = length;
          ev.currentTarget.selectionEnd = length;
          return;
        }
      }

      const firstItem = (resultListRef.current?.firstElementChild ??
        recentSearchesRef.current?.firstElementChild) as HTMLAnchorElement;

      firstItem?.focus();
    }
  };

  const handleEscape = () => searchInputRef.current?.focus();
  const showEmpty = !loading && query && data?.length === 0;

  return (
    <Scene textTitle={query ? `${query} – ${t("Search")}` : t("Search")}>
      <RegisterKeyDown trigger="Escape" handler={history.goBack} />
      {loading && <LoadingIndicator />}
      {props.notFound && (
        <div>
          <h1>{t("Not Found")}</h1>
          <Empty>
            {t("We were unable to find the page you’re looking for.")}
          </Empty>
        </div>
      )}
      <ResultsWrapper column auto>
        <form
          method="GET"
          action={searchPath()}
          onSubmit={(ev) => ev.preventDefault()}
        >
          <SearchInput
            name="query"
            key={query ? "search" : "recent"}
            ref={searchInputRef}
            placeholder={`${
              documentId
                ? t("Search in document")
                : collectionId
                ? t("Search in collection")
                : t("Search")
            }…`}
            onKeyDown={handleKeyDown}
            defaultValue={query ?? ""}
          />

          <Filters>
            {filterVisibility.document && (
              <DocumentFilter
                document={document!}
                onClick={() => {
                  handleFilterChange({ documentId: undefined });
                }}
              />
            )}
            {filterVisibility.collection && (
              <CollectionFilter
                collectionId={collectionId}
                onSelect={(collectionId) =>
                  handleFilterChange({ collectionId })
                }
              />
            )}
            {filterVisibility.user && (
              <UserFilter
                userId={userId}
                onSelect={(userId) => handleFilterChange({ userId })}
              />
            )}
            {filterVisibility.documentType && (
              <DocumentTypeFilter
                statusFilter={statusFilter}
                onSelect={({ statusFilter }) =>
                  handleFilterChange({ statusFilter })
                }
              />
            )}
            {filterVisibility.date && (
              <DateFilter
                dateFilter={dateFilter}
                onSelect={(dateFilter) => handleFilterChange({ dateFilter })}
              />
            )}
            {filterVisibility.title && (
              <SearchTitlesFilter
                width={26}
                height={14}
                label={t("Search titles only")}
                onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
                  handleFilterChange({ titleFilter: ev.target.checked });
                }}
                checked={titleFilter}
              />
            )}
          </Filters>
        </form>
        {isSearchable ? (
          <>
            {error ? (
              <Fade>
                <Centered column>
                  <Text as="h1">{t("Something went wrong")}</Text>
                  <Text as="p" type="secondary">
                    {t(
                      "Please try again or contact support if the problem persists"
                    )}
                    .
                  </Text>
                </Centered>
              </Fade>
            ) : showEmpty ? (
              <Fade>
                <Centered column>
                  <Text as="p" type="secondary">
                    {t("No documents found for your search filters.")}
                  </Text>
                </Centered>
              </Fade>
            ) : null}
            <ResultList column>
              <StyledArrowKeyNavigation
                ref={resultListRef}
                onEscape={handleEscape}
                aria-label={t("Search Results")}
                items={data ?? []}
              >
                {() =>
                  data?.length && !error
                    ? data.map((result) => (
                        <DocumentListItem
                          key={result.document.id}
                          document={result.document}
                          highlight={query}
                          context={result.context}
                          showCollection
                          showTemplate
                        />
                      ))
                    : null
                }
              </StyledArrowKeyNavigation>
              <Waypoint
                key={data?.length}
                onEnter={end || loading ? undefined : next}
                debug={env.ENVIRONMENT === "development"}
              />
            </ResultList>
          </>
        ) : documentId ? null : (
          <RecentSearches ref={recentSearchesRef} onEscape={handleEscape} />
        )}
      </ResultsWrapper>
    </Scene>
  );
}

const Centered = styled(Flex)`
  text-align: center;
  margin: 30vh auto 0;
  max-width: 380px;
  transform: translateY(-50%);
`;

const ResultsWrapper = styled(Flex)`
  ${breakpoint("tablet")`
    margin-top: 40px;
  `};
`;

const ResultList = styled(Flex)`
  margin-bottom: 150px;
`;

const StyledArrowKeyNavigation = styled(ArrowKeyNavigation)`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const Filters = styled(Flex)`
  margin-bottom: 12px;
  transition: opacity 100ms ease-in-out;
  overflow-y: hidden;
  overflow-x: auto;
  padding: 8px 0;
  height: 28px;
  gap: 8px;

  ${hideScrollbars()}

  ${breakpoint("tablet")`
    padding: 0;
  `};
`;

const SearchTitlesFilter = styled(Switch)`
  white-space: nowrap;
  margin-left: 8px;
  margin-top: 4px;
  font-size: 14px;
  font-weight: 400;
`;

export default observer(Search);
