import { isEqual } from "lodash";
import { observer } from "mobx-react";
import queryString from "query-string";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  RouteComponentProps,
  StaticContext,
  useLocation,
  withRouter,
} from "react-router";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { v4 as uuidV4 } from "uuid";
import { DateFilter as TDateFilter } from "@shared/types";
import { DEFAULT_PAGINATION_LIMIT } from "~/stores/BaseStore";
import ArrowKeyNavigation from "~/components/ArrowKeyNavigation";
import DocumentListItem from "~/components/DocumentListItem";
import Empty from "~/components/Empty";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import LoadingIndicator from "~/components/LoadingIndicator";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import Logger from "~/utils/Logger";
import { searchPath } from "~/utils/routeHelpers";
import { decodeURIComponentSafe } from "~/utils/urls";
import CollectionFilter from "./components/CollectionFilter";
import DateFilter from "./components/DateFilter";
import RecentSearches from "./components/RecentSearches";
import SearchInput from "./components/SearchInput";
import StatusFilter from "./components/StatusFilter";
import UserFilter from "./components/UserFilter";

type Props = RouteComponentProps<
  { term: string },
  StaticContext,
  { search: string; fromMenu?: boolean }
> & {
  notFound?: boolean;
};

function Search(props: Props) {
  const { t } = useTranslation();
  const { documents, searches } = useStores();
  const { pathname, search } = useLocation();

  const term = decodeURIComponentSafe(props.match.params.term || "");

  const [query, setQuery] = React.useState(term);

  const title = query ? `${query} – ${t("Search")}` : t("Search");

  const compositeRef = React.useRef<HTMLDivElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  // Possibly
  // const [searchParams, setSearchParams] = useSearchParams();
  // with React Router v6
  const [params, setParams] = React.useState(new URLSearchParams(search));

  const includeArchived = mightExist(params.get("includeArchived")) === "true";
  const dateFilter = mightExist(params.get("dateFilter")) as TDateFilter;
  const userId = mightExist(params.get("userId"));
  const collectionId = mightExist(params.get("collectionId"));

  // Case where user has called search again
  // without changing search term.
  const [cachedQuery, setCachedQuery] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const [lastParams, setLastParams] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [allowLoadMore, setAllowLoadMore] = React.useState(true);

  const fetchResults = React.useCallback(async () => {
    if (query.trim()) {
      const params = {
        offset: offset,
        limit: DEFAULT_PAGINATION_LIMIT,
        dateFilter: dateFilter,
        includeArchived: includeArchived,
        includeDrafts: true,
        collectionId: collectionId,
        userId: userId,
      };

      // we just requested this thing – no need to try again
      if (cachedQuery === query && isEqual(params, lastParams)) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setCachedQuery(query);
      setLastParams(params);

      try {
        const results = await documents.search(query, params);

        // Add to the searches store so this search can immediately appear in
        // the recent searches list without a flash of load
        searches.add({
          id: uuidV4(),
          query: query,
          createdAt: new Date().toISOString(),
        });

        if (results.length === 0 || results.length < DEFAULT_PAGINATION_LIMIT) {
          setAllowLoadMore(false);
        } else {
          setOffset(DEFAULT_PAGINATION_LIMIT);
        }
      } catch (error) {
        Logger.error("Search query failed", error);
        setCachedQuery("");
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      setCachedQuery(query);
    }
  }, [
    collectionId,
    dateFilter,
    includeArchived,
    lastParams,
    cachedQuery,
    offset,
    documents,
    searches,
    query,
    userId,
  ]);

  const updateLocation = React.useCallback(
    (query: string) => {
      props.history.replace({
        pathname: searchPath(query),
        search: search,
      });
    },
    [props.history, search]
  );

  const handleQueryChange = React.useCallback(() => {
    setParams(new URLSearchParams(search));
    setOffset(0);
    setAllowLoadMore(true);
    // To prevent "no results" showing before debounce kicks in
    setIsLoading(true);
    fetchResults();
  }, [fetchResults, search]);

  const handleTermChange = React.useCallback(() => {
    const potentialQuery = decodeURIComponentSafe(
      props.match.params.term || ""
    );
    setQuery(potentialQuery ? potentialQuery : "");
    setOffset(0);
    setAllowLoadMore(true);
    // To prevent "no results" showing before debounce kicks in
    setIsLoading(true);
    fetchResults();
  }, [fetchResults, props.match.params.term]);

  React.useEffect(() => {
    handleQueryChange();
  }, [handleQueryChange, search]);

  React.useEffect(() => {
    handleTermChange();
  }, [handleTermChange, props.match.params.term]);

  const goBack = React.useCallback(() => {
    props.history.goBack();
  }, [props.history]);

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === "Enter") {
        updateLocation(ev.currentTarget.value);
        fetchResults();
        return;
      }

      if (ev.key === "Escape") {
        ev.preventDefault();
        return goBack();
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

        if (compositeRef) {
          const linkItems = compositeRef.current?.querySelectorAll(
            "[href]"
          ) as NodeListOf<HTMLAnchorElement>;
          linkItems[0]?.focus();
        }
      }
    },
    [fetchResults, goBack, updateLocation]
  );

  const handleFilterChange = React.useCallback(
    (updateSearch: {
      collectionId?: string | undefined;
      userId?: string | undefined;
      dateFilter?: TDateFilter;
      includeArchived?: boolean | undefined;
    }) => {
      props.history.replace({
        pathname: pathname,
        search: queryString.stringify(
          { ...queryString.parse(search), ...updateSearch },
          {
            skipEmptyString: true,
          }
        ),
      });
    },
    [props.history, pathname, search]
  );

  const loadMoreResults = React.useCallback(async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!allowLoadMore || isLoading) {
      return;
    }

    // Fetch more results
    await fetchResults();
  }, [allowLoadMore, isLoading, fetchResults]);

  const handleEscape = React.useCallback(() => {
    searchInputRef?.current?.focus();
  }, [searchInputRef]);

  const { notFound } = props;
  const results = documents.searchResults(query);
  const showEmpty = !isLoading && query && results?.length === 0;

  // Set `InputSearch` box value when
  // `term` changes.
  React.useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.value = term;
    }
  }, [term]);

  return (
    <Scene textTitle={title}>
      <RegisterKeyDown trigger="Escape" handler={goBack} />
      {isLoading && <LoadingIndicator />}
      {notFound && (
        <div>
          <h1>{t("Not Found")}</h1>
          <Empty>
            {t("We were unable to find the page you’re looking for.")}
          </Empty>
        </div>
      )}
      <ResultsWrapper column auto>
        <SearchInput
          ref={searchInputRef}
          placeholder={`${t("Search")}…`}
          onKeyDown={handleKeyDown}
          defaultValue={query}
        />

        {query ? (
          <Filters>
            <StatusFilter
              includeArchived={includeArchived}
              onSelect={(includeArchived) =>
                handleFilterChange({
                  includeArchived,
                })
              }
            />
            <CollectionFilter
              collectionId={collectionId}
              onSelect={(collectionId) =>
                handleFilterChange({
                  collectionId,
                })
              }
            />
            <UserFilter
              userId={userId}
              onSelect={(userId) =>
                handleFilterChange({
                  userId,
                })
              }
            />
            <DateFilter
              dateFilter={dateFilter}
              onSelect={(dateFilter) =>
                handleFilterChange({
                  dateFilter,
                })
              }
            />
          </Filters>
        ) : (
          <RecentSearches />
        )}
        {showEmpty && (
          <Fade>
            <Centered column>
              <Text type="secondary">
                <Trans>No documents found for your search filters.</Trans>
              </Text>
            </Centered>
          </Fade>
        )}
        <ResultList column>
          <StyledArrowKeyNavigation
            ref={compositeRef}
            onEscape={handleEscape}
            aria-label={t("Search Results")}
          >
            {(compositeProps) =>
              results?.map((result) => {
                const document = documents.data.get(result.document.id);
                if (!document) {
                  return null;
                }
                return (
                  <DocumentListItem
                    key={document.id}
                    document={document}
                    highlight={query}
                    context={result.context}
                    showCollection
                    showTemplate
                    {...compositeProps}
                  />
                );
              })
            }
          </StyledArrowKeyNavigation>
          {allowLoadMore && <Waypoint key={offset} onEnter={loadMoreResults} />}
        </ResultList>
      </ResultsWrapper>
    </Scene>
  );
}

// Helper function to collapse `null | undefined`
// to just `undefined`
const mightExist = (value: string | null | undefined): string | undefined => {
  return value ? value : undefined;
};

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
  opacity: 0.85;
  transition: opacity 100ms ease-in-out;
  overflow-y: hidden;
  overflow-x: auto;
  padding: 8px 0;

  ${breakpoint("tablet")`
    padding: 0;
  `};

  &:hover {
    opacity: 1;
  }
`;

export default withRouter(observer(Search));
