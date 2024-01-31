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
import { DateFilter as TDateFilter } from "@shared/types";
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
import { hover } from "~/styles";
import { SearchResult } from "~/types";
import { searchPath } from "~/utils/routeHelpers";
import { decodeURIComponentSafe } from "~/utils/urls";
import CollectionFilter from "./components/CollectionFilter";
import DateFilter from "./components/DateFilter";
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
  const resultListCompositeRef = React.useRef<HTMLDivElement | null>(null);
  const recentSearchesCompositeRef = React.useRef<HTMLDivElement | null>(null);

  // filters
  const query = decodeURIComponentSafe(routeMatch.params.term ?? "");
  const includeArchived = params.get("includeArchived") === "true";
  const includeDrafts = params.get("includeDrafts") !== "false";
  const collectionId = params.get("collectionId") ?? undefined;
  const userId = params.get("userId") ?? undefined;
  const dateFilter = (params.get("dateFilter") as TDateFilter) ?? undefined;
  const titleFilter = params.get("titleFilter") === "true";

  const filters = React.useMemo(
    () => ({
      query,
      includeArchived,
      includeDrafts,
      collectionId,
      userId,
      dateFilter,
      titleFilter,
    }),
    [
      query,
      includeArchived,
      includeDrafts,
      collectionId,
      userId,
      dateFilter,
      titleFilter,
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

      return async () =>
        titleFilter
          ? await documents.searchTitles(query, filters)
          : await documents.search(query, filters);
    }

    return () => Promise.resolve([] as SearchResult[]);
  }, [query, titleFilter, filters, searches, documents]);

  const { data, next, end, loading } = usePaginatedRequest(requestFn, {
    limit: Pagination.defaultLimit,
  });

  const updateLocation = (query: string) => {
    history.replace({
      pathname: searchPath(query),
      search: location.search,
    });
  };

  // All filters go through the query string so that searches are bookmarkable, which neccesitates
  // some complexity as the query string is the source of truth for the filters.
  const handleFilterChange = (search: {
    collectionId?: string | undefined;
    userId?: string | undefined;
    dateFilter?: TDateFilter;
    includeArchived?: boolean | undefined;
    includeDrafts?: boolean | undefined;
    titleFilter?: boolean | undefined;
  }) => {
    history.replace({
      pathname: location.pathname,
      search: queryString.stringify(
        { ...queryString.parse(location.search), ...search },
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

      const firstResultItem = (
        resultListCompositeRef.current?.querySelectorAll(
          "[href]"
        ) as NodeListOf<HTMLAnchorElement>
      )?.[0];

      const firstRecentSearchItem = (
        recentSearchesCompositeRef.current?.querySelectorAll(
          "li > [href]"
        ) as NodeListOf<HTMLAnchorElement>
      )?.[0];

      const firstItem = firstResultItem ?? firstRecentSearchItem;
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
        <SearchInput
          key={query ? "search" : "recent"}
          ref={searchInputRef}
          placeholder={`${t("Search")}…`}
          onKeyDown={handleKeyDown}
          defaultValue={query}
        />

        {query ? (
          <>
            <Filters>
              <DocumentTypeFilter
                includeArchived={includeArchived}
                includeDrafts={includeDrafts}
                onSelect={({ includeArchived, includeDrafts }) =>
                  handleFilterChange({ includeArchived, includeDrafts })
                }
              />
              <CollectionFilter
                collectionId={collectionId}
                onSelect={(collectionId) =>
                  handleFilterChange({ collectionId })
                }
              />
              <UserFilter
                userId={userId}
                onSelect={(userId) => handleFilterChange({ userId })}
              />
              <DateFilter
                dateFilter={dateFilter}
                onSelect={(dateFilter) => handleFilterChange({ dateFilter })}
              />
              <SearchTitlesFilter
                width={26}
                height={14}
                label={t("Search titles only")}
                onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
                  handleFilterChange({ titleFilter: ev.target.checked });
                }}
                checked={titleFilter}
              />
            </Filters>
            {showEmpty && (
              <Fade>
                <Centered column>
                  <Text as="p" type="secondary">
                    {t("No documents found for your search filters.")}
                  </Text>
                </Centered>
              </Fade>
            )}
            <ResultList column>
              <StyledArrowKeyNavigation
                ref={resultListCompositeRef}
                onEscape={handleEscape}
                aria-label={t("Search Results")}
              >
                {(compositeProps) =>
                  data?.length
                    ? data.map((result) => (
                        <DocumentListItem
                          key={result.document.id}
                          document={result.document}
                          highlight={query}
                          context={result.context}
                          showCollection
                          showTemplate
                          {...compositeProps}
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
        ) : (
          <RecentSearches
            ref={recentSearchesCompositeRef}
            onEscape={handleEscape}
          />
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
  opacity: 0.85;
  transition: opacity 100ms ease-in-out;
  overflow-y: hidden;
  overflow-x: auto;
  padding: 8px 0;
  ${hideScrollbars()}

  ${breakpoint("tablet")`
    padding: 0;
  `};

  &: ${hover} {
    opacity: 1;
  }
`;

const SearchTitlesFilter = styled(Switch)`
  white-space: nowrap;
  margin-left: 8px;
  margin-top: 2px;
  font-size: 14px;
  font-weight: 400;
`;

export default observer(Search);
