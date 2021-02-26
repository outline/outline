// @flow
import ArrowKeyNavigation from "boundless-arrow-key-navigation";
import { debounce, isEqual } from "lodash";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import queryString from "query-string";
import * as React from "react";
import ReactDOM from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";
import { Trans, useTranslation } from "react-i18next";
import { Link, useLocation, useRouteMatch, useHistory } from "react-router-dom";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";

import { DEFAULT_PAGINATION_LIMIT } from "stores/BaseStore";
import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import DocumentListItem from "components/DocumentListItem";
import Empty from "components/Empty";
import Fade from "components/Fade";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import LoadingIndicator from "components/LoadingIndicator";
import PageTitle from "components/PageTitle";
import CollectionFilter from "./components/CollectionFilter";
import DateFilter from "./components/DateFilter";
import SearchField from "./components/SearchField";
import StatusFilter from "./components/StatusFilter";
import UserFilter from "./components/UserFilter";
import useStores from "hooks/useStores";
import NewDocumentMenu from "menus/NewDocumentMenu";
import { type LocationWithState } from "types";
import { metaDisplay } from "utils/keyboard";
import { newDocumentUrl, searchUrl } from "utils/routeHelpers";
import { decodeURIComponentSafe } from "utils/urls";

type Props = {
  notFound: ?boolean,
};

function Search({ notFound }: Props) {
  const { documents } = useStores();
  const location = useLocation<LocationWithState>();
  const history = useHistory();
  const match = useRouteMatch();

  const { t } = useTranslation();

  let firstDocument = React.useRef<React.Component<any>>(null);
  const lastQuery = React.useRef("");
  const lastParams = React.useRef<Object>({});

  const [query, setQuery] = React.useState<string>(
    decodeURIComponentSafe(match.params.term || "")
  );
  const [params, setParams] = React.useState<URLSearchParams>(
    new URLSearchParams()
  );
  const [offset, setOffset] = React.useState(0);
  const [allowLoadMore, setAllowLoadMore] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pinToTop, setPinToTop] = React.useState(!!match.params.term);

  const collectionId = params.get("collectionId") || undefined;
  const dateFilter = params.get("dateFilter") || undefined;
  const userId = params.get("userId") || undefined;
  const includeArchived = params.get("includeArchived") === "true";

  const results = documents.searchResults(query);
  const showEmpty = !isLoading && query && results.length === 0;
  const showShortcutTip =
    !pinToTop && location.state && location.state.fromMenu;

  const fetchResults = React.useCallback(async () => {
    if (query) {
      const params = {
        offset: offset,
        limit: DEFAULT_PAGINATION_LIMIT,
        dateFilter: dateFilter,
        includeArchived: includeArchived,
        includeDrafts: true,
        collectionId: collectionId,
        userId: userId,
      };

      // we just request  ed this thing – no need to try again
      if (lastQuery === query && isEqual(params, lastParams)) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      lastQuery.current = query;
      lastParams.current = params;

      try {
        const results = await documents.search(query, params);
        setPinToTop(true);

        if (results.length === 0 || results.length < DEFAULT_PAGINATION_LIMIT) {
          setAllowLoadMore(false);
        } else {
          setOffset((preOffset) => preOffset + DEFAULT_PAGINATION_LIMIT);
        }
      } catch (err) {
        lastParams.current = "";
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      setPinToTop(false);
      lastQuery.current = query;
    }
  }, [
    collectionId,
    dateFilter,
    userId,
    documents,
    includeArchived,
    offset,
    query,
  ]);

  const fetchResultsDebounced = React.useCallback(
    () =>
      debounce(fetchResults, 500, {
        leading: false,
        trailing: true,
      }),
    [fetchResults]
  );

  const handleQueryChange = React.useCallback(() => {
    setParams(new URLSearchParams(location.search));
    setOffset(0);
    setAllowLoadMore(true);

    // To prevent "no results" showing before debounce kicks in
    setIsLoading(true);

    fetchResultsDebounced();
  }, [location.search, fetchResultsDebounced]);

  const handleTermChange = React.useCallback(() => {
    const query = decodeURIComponentSafe(match.params.term || "");
    setQuery(query ? query : "");
    setOffset(0);
    setAllowLoadMore(true);

    // To prevent "no results" showing before debounce kicks in
    setIsLoading(!!query);

    fetchResultsDebounced();
  }, [match.params.term, fetchResultsDebounced]);

  React.useEffect(() => {
    handleQueryChange();
  }, [handleQueryChange]);

  React.useEffect(() => {
    handleTermChange();
  }, [handleTermChange]);

  useHotkeys("esc", () => {
    history.goBack();
  });

  const handleKeyDown = React.useCallback(
    async (ev: SyntheticKeyboardEvent<>) => {
      if (ev.key === "Enter") {
        await fetchResults();
        return;
      }

      if (ev.key === "Escape") {
        ev.preventDefault();
        return history.goBack();
      }

      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        if (firstDocument.current) {
          const element = ReactDOM.findDOMNode(firstDocument);
          if (element instanceof HTMLElement) element.focus();
        }
      }
    },
    [fetchResults, history]
  );

  const handleFilterChange = React.useCallback(
    (search: {
      collectionId?: ?string,
      userId?: ?string,
      dateFilter?: ?string,
      includeArchived?: ?string,
    }) => {
      history.replace({
        pathname: location.pathname,
        search: queryString.stringify({
          ...queryString.parse(location.search),
          ...search,
        }),
      });
    },
    [location.pathname, location.search, history]
  );

  const handleNewDoc = React.useCallback(() => {
    if (collectionId) {
      history.push(newDocumentUrl(collectionId));
    }
  }, [collectionId, history]);

  const title = query ? `${query} – ${t("Search")}` : t("Search");

  const loadMoreResults = React.useCallback(async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!allowLoadMore || isLoading) return;

    // Fetch more results
    await fetchResults();
  }, [fetchResults, allowLoadMore, isLoading]);

  const updateLocation = React.useCallback(
    (query: string) => {
      history.replace({
        pathname: searchUrl(query),
        search: location.search,
      });
    },
    [location.search, history]
  );

  const setFirstDocumentRef = (ref: any) => {
    firstDocument.current = ref;
  };

  return (
    <Container auto>
      <PageTitle title={title} />
      {isLoading && <LoadingIndicator />}
      {notFound && (
        <div>
          <h1>{t("Not Found")}</h1>
          <Empty>
            {t("We were unable to find the page you’re looking for.")}
          </Empty>
        </div>
      )}
      <ResultsWrapper pinToTop={pinToTop} column auto>
        <SearchField
          placeholder={`${t("Search")}…`}
          onKeyDown={handleKeyDown}
          onChange={updateLocation}
          defaultValue={query}
        />
        {showShortcutTip && (
          <Fade>
            <HelpText small>
              <Trans
                defaults="Use the <em>{{ meta }}+K</em> shortcut to search from anywhere in your knowledge base"
                values={{ meta: metaDisplay }}
                components={{ em: <strong /> }}
              />
            </HelpText>
          </Fade>
        )}
        {pinToTop && (
          <Filters>
            <StatusFilter
              includeArchived={includeArchived}
              onSelect={(includeArchived) =>
                handleFilterChange({ includeArchived })
              }
            />
            <CollectionFilter
              collectionId={collectionId}
              onSelect={(collectionId) => handleFilterChange({ collectionId })}
            />
            <UserFilter
              userId={userId}
              onSelect={(userId) => handleFilterChange({ userId })}
            />
            <DateFilter
              dateFilter={dateFilter}
              onSelect={(dateFilter) => handleFilterChange({ dateFilter })}
            />
          </Filters>
        )}
        {showEmpty && (
          <Fade>
            <Centered column>
              <HelpText>
                <Trans>
                  No documents found for your search filters. <br />
                  Create a new document?
                </Trans>
              </HelpText>
              <Wrapper>
                {collectionId ? (
                  <Button onClick={handleNewDoc} icon={<PlusIcon />} primary>
                    {t("New doc")}
                  </Button>
                ) : (
                  <NewDocumentMenu />
                )}
                &nbsp;&nbsp;
                <Button as={Link} to="/search" neutral>
                  {t("Clear filters")}
                </Button>
              </Wrapper>
            </Centered>
          </Fade>
        )}
        <ResultList column visible={pinToTop}>
          <StyledArrowKeyNavigation
            mode={ArrowKeyNavigation.mode.VERTICAL}
            defaultActiveChildIndex={0}
          >
            {results.map((result, index) => {
              const document = documents.data.get(result.document.id);
              if (!document) return null;

              return (
                <DocumentListItem
                  ref={(ref) => index === 0 && setFirstDocumentRef(ref)}
                  key={document.id}
                  document={document}
                  highlight={query}
                  context={result.context}
                  showCollection
                  showTemplate
                />
              );
            })}
          </StyledArrowKeyNavigation>
          {allowLoadMore && <Waypoint key={offset} onEnter={loadMoreResults} />}
        </ResultList>
      </ResultsWrapper>
    </Container>
  );
}

const Wrapper = styled(Flex)`
  justify-content: center;
  margin: 10px 0;
`;

const Centered = styled(Flex)`
  text-align: center;
  margin: 30vh auto 0;
  max-width: 380px;
  transform: translateY(-50%);
`;

const Container = styled(CenteredContent)`
  > div {
    position: relative;
    height: 100%;
  }
`;

const ResultsWrapper = styled(Flex)`
  position: absolute;
  transition: all 300ms cubic-bezier(0.65, 0.05, 0.36, 1);
  top: ${(props) => (props.pinToTop ? "0%" : "50%")};
  margin-top: ${(props) => (props.pinToTop ? "40px" : "-75px")};
  width: 100%;
`;

const ResultList = styled(Flex)`
  margin-bottom: 150px;
  opacity: ${(props) => (props.visible ? "1" : "0")};
  transition: all 400ms cubic-bezier(0.65, 0.05, 0.36, 1);
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

export default observer(Search);
