import { observer } from "mobx-react";
import { v4 as uuidv4 } from "uuid";
import queryString from "query-string";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import { Pagination } from "@shared/constants";
import type { Filter } from "@shared/helpers/FilterHelper";
import type {
  SortFilter as TSortFilter,
  DirectionFilter as TDirectionFilter,
} from "@shared/types";
import ArrowKeyNavigation from "~/components/ArrowKeyNavigation";
import DocumentListItem from "~/components/DocumentListItem";
import DocumentSelectionToolbar from "~/components/DocumentSelectionToolbar";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import LoadingIndicator from "~/components/LoadingIndicator";
import { ModelSelectionProvider } from "~/components/ModelSelectionContext";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { Waypoint } from "~/components/Waypoint";
import usePaginatedRequest from "~/hooks/usePaginatedRequest";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { PAGINATION_SYMBOL } from "~/stores/base/Store";
import type { PaginationParams, SearchResult } from "~/types";
import { preventDefault } from "~/utils/events";
import { searchPath } from "~/utils/routeHelpers";
import { decodeURIComponentSafe } from "~/utils/urls";
import { AddFilterButton } from "./components/AddFilterButton";
import { DocumentFilter } from "./components/DocumentFilter";
import RecentSearches from "./components/RecentSearches";
import SearchInput from "./components/SearchInput";
import { SortInput } from "./components/SortInput";
import { SearchFilterChip } from "./components/SearchFilterChip";
import type { SearchFilter } from "./searchFilters";
import {
  TOGGLE_ON,
  getApiFilter,
  getFilterParamChanges,
  getFilterValues,
  isFilterSet,
  useSearchFilters,
} from "./searchFilters";

function Search() {
  const { t } = useTranslation();
  const { documents, searches, policies } = useStores();

  // routing
  const params = useQuery();
  const history = useHistory();
  const routeMatch = useRouteMatch<{ query: string }>();
  const handleGoBack = React.useCallback(() => history.goBack(), [history]);

  // refs
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const resultListRef = React.useRef<HTMLDivElement | null>(null);
  const recentSearchesRef = React.useRef<HTMLDivElement | null>(null);

  // filters
  const decodedQuery = decodeURIComponentSafe(
    routeMatch.params.query ?? params.get("q") ?? params.get("query") ?? ""
  ).trim();
  const query = decodedQuery !== "" ? decodedQuery : undefined;
  const documentId =
    params.get("documentId") ?? params.get("documentId.eq") ?? undefined;
  const sort = (params.get("sort") as TSortFilter) ?? "";
  const direction = (params.get("direction") as TDirectionFilter) ?? "";
  const document = documentId ? documents.get(documentId) : undefined;

  const searchFilters = useSearchFilters();
  const [pendingFilterIds, setPendingFilterIds] = React.useState<string[]>([]);

  const { isSearchable, visibleFilters, filters, titleFilter } =
    React.useMemo(() => {
      const visible = searchFilters.filter(
        (filter) => filter.isAvailable?.({ query, document }) ?? true
      );
      // Show results when there is a query or at least one filter is set.
      const searchable =
        !!query ||
        !!documentId ||
        visible.some((filter) => isFilterSet(filter, params));

      const expressions = visible
        .map((filter) => getApiFilter(filter, params))
        .filter((filter): filter is Filter => !!filter);

      if (documentId) {
        expressions.push({
          field: "documentId",
          operator: "eq",
          value: documentId,
        });
      }

      return {
        isSearchable: searchable,
        visibleFilters: visible,
        filters: expressions.length > 0 ? expressions : undefined,
        // An empty query matches every title, so list all results without one.
        titleFilter:
          !!query &&
          visible.some(
            (filter) => filter.type === "toggle" && isFilterSet(filter, params)
          ),
      };
    }, [searchFilters, params, query, document, documentId]);

  const isCollectionScoped = visibleFilters.some(
    (filter) => filter.id === "collectionId" && isFilterSet(filter, params)
  );

  const shownFilters = visibleFilters.filter(
    (filter) =>
      filter.pinned ||
      isFilterSet(filter, params) ||
      pendingFilterIds.includes(filter.id)
  );
  const addableFilters = visibleFilters.filter(
    (filter) => !shownFilters.includes(filter)
  );

  const requestParams = React.useMemo(
    () => ({
      query,
      titleFilter,
      sort,
      direction,
      filters,
    }),
    [query, titleFilter, sort, direction, filters]
  );

  const [resultCount, setResultCount] = React.useState<{
    params: typeof requestParams;
    total: number;
  }>();

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
      return async (params?: PaginationParams) => {
        const paginationParams = {
          offset: params?.offset,
          limit: params?.limit,
        };
        if (titleFilter) {
          return await documents.searchTitles({
            ...requestParams,
            ...paginationParams,
          });
        }

        const results = await documents.search({
          ...requestParams,
          ...paginationParams,
        });
        const total = results[PAGINATION_SYMBOL]?.total;
        if (!params?.offset && total !== undefined) {
          setResultCount({ params: requestParams, total });
        }
        return results;
      };
    }

    return () => Promise.resolve([] as SearchResult[]);
  }, [query, titleFilter, requestParams, searches, documents, isSearchable]);

  // Keyed on the request so a count from an earlier search is never shown.
  const total =
    resultCount?.params === requestParams ? resultCount.total : undefined;

  const { data, next, end, error, loading } = usePaginatedRequest(requestFn, {
    limit: Pagination.defaultLimit,
  });

  // Only updatable documents are selectable, matching the per-item checkboxes.
  const itemIds = React.useMemo(
    () =>
      data
        ?.filter((result) => policies.abilities(result.document.id).update)
        .map((result) => result.document.id) ?? [],
    [data, policies]
  );

  const updateLocation = (query: string) => {
    // If query came from route params, navigate to base search path
    const pathname = routeMatch.params.query
      ? searchPath()
      : history.location.pathname;

    history.replace({
      pathname,
      search: queryString.stringify(
        { ...queryString.parse(history.location.search), q: query },
        {
          skipEmptyString: true,
        }
      ),
    });
  };

  // All filters go through the query string so that searches are bookmarkable, which neccesitates
  // some complexity as the query string is the source of truth for the filters.
  const handleFilterChange = (
    search: Record<string, string | string[] | undefined>
  ) => {
    if (search.sort === "relevance") {
      search.sort = undefined;
      search.direction = undefined;
    }

    history.replace({
      pathname: history.location.pathname,
      search: queryString.stringify(
        { ...queryString.parse(history.location.search), ...search },
        {
          skipEmptyString: true,
        }
      ),
    });
  };

  const handleChangeFilter = React.useCallback(
    (id: string, values: string[] | undefined) => {
      const filter = searchFilters.find((item) => item.id === id);
      if (!filter) {
        return;
      }
      const { search } = history.location;
      history.replace({
        pathname: history.location.pathname,
        search: queryString.stringify(
          {
            ...queryString.parse(search),
            ...getFilterParamChanges(
              filter,
              values,
              new URLSearchParams(search)
            ),
          },
          { skipEmptyString: true, arrayFormat: "comma" }
        ),
      });
    },
    [history, searchFilters]
  );

  const handleAddFilter = (id: string) => {
    const filter = searchFilters.find((item) => item.id === id);
    if (filter?.type === "toggle") {
      handleChangeFilter(id, [TOGGLE_ON]);
      return;
    }
    setPendingFilterIds((ids) => [...ids, id]);
  };

  const handleFilterOpenChange = React.useCallback(
    (id: string, open: boolean) => {
      if (!open) {
        setPendingFilterIds((ids) => ids.filter((item) => item !== id));
      }
    },
    []
  );

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.nativeEvent.isComposing) {
      return;
    }

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

  const renderFilterChip = (filter: SearchFilter) => (
    <SearchFilterChip
      key={filter.id}
      filter={filter}
      values={getFilterValues(filter, params)}
      isSet={isFilterSet(filter, params)}
      defaultOpen={pendingFilterIds.includes(filter.id)}
      onChange={handleChangeFilter}
      onOpenChange={handleFilterOpenChange}
    />
  );

  const sortInput = isSearchable ? (
    <SortInput
      sort={sort}
      direction={direction}
      onSelect={(sort, direction) => handleFilterChange({ sort, direction })}
    />
  ) : null;

  return (
    <Scene textTitle={query ? `${query} – ${t("Search")}` : t("Search")}>
      <RegisterKeyDown trigger="Escape" handler={handleGoBack} />
      {loading && <LoadingIndicator />}
      <ResultsWrapper column auto>
        <form method="GET" action={searchPath()} onSubmit={preventDefault}>
          <SearchInput
            name="query"
            key={query ? "search" : "recent"}
            ref={searchInputRef}
            placeholder={`${
              documentId
                ? t("Search in document")
                : isCollectionScoped
                  ? t("Search in collection")
                  : t("Search")
            }…`}
            onKeyDown={handleKeyDown}
            defaultValue={query ?? ""}
          />
          <FilterChips align="center" gap={6} wrap>
            {document && (
              <DocumentFilter
                document={document}
                onRemove={() =>
                  handleFilterChange({
                    documentId: undefined,
                    "documentId.eq": undefined,
                  })
                }
              />
            )}
            {shownFilters.map(renderFilterChip)}
            {addableFilters.length > 0 && (
              <AddFilterButton
                filters={addableFilters}
                onSelect={handleAddFilter}
              />
            )}
          </FilterChips>
          {sortInput && (
            <ResultsMeta as="div" type="secondary" size="small">
              {total !== undefined && (
                <>
                  <span>{t("{{ count }} result", { count: total })}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              {sortInput}
            </ResultsMeta>
          )}
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
            <ModelSelectionProvider
              items={itemIds}
              toolbar={<DocumentSelectionToolbar />}
            >
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
                          />
                        ))
                      : null
                  }
                </StyledArrowKeyNavigation>
                <Waypoint
                  key={data?.length}
                  onEnter={end || loading ? undefined : next}
                />
              </ResultList>
            </ModelSelectionProvider>
          </>
        ) : (
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

const FilterChips = styled(Flex)`
  row-gap: 8px;
  margin-bottom: 12px;
  padding-top: 4px;

  ${breakpoint("mobile", "tablet")`
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    margin-inline: -16px;
    padding: 4px 16px 0;

    & > * {
      flex-shrink: 0;
    }
  `};
`;

const ResultsMeta = styled(Text)`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`;

export default observer(Search);
