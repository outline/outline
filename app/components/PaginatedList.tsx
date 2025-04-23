import isEqual from "lodash/isEqual";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Waypoint } from "react-waypoint";
import { Pagination } from "@shared/constants";
import { useStores } from "~/hooks/useStores";
import ArrowKeyNavigation from "~/components/ArrowKeyNavigation";
import DelayedMount from "~/components/DelayedMount";
import PlaceholderList from "~/components/List/Placeholder";
import { dateToHeading } from "~/utils/date";

export interface PaginatedItem {
  id?: string;
  updatedAt?: string;
  createdAt?: string;
}

type Props<T> = React.HTMLAttributes<HTMLDivElement> & {
  fetch?: (
    options: Record<string, any> | undefined
  ) => Promise<T[] | undefined> | undefined;
  options?: Record<string, any>;
  heading?: React.ReactNode;
  empty?: React.ReactNode;
  loading?: React.ReactElement;
  items?: T[];
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderError?: (options: {
    error: Error;
    retry: () => void;
  }) => React.ReactNode;
  renderHeading?: (name: React.ReactElement<any> | string) => React.ReactNode;
  onEscape?: (ev: React.KeyboardEvent<HTMLDivElement>) => void;
  listRef?: React.RefObject<HTMLDivElement>;
};

function PaginatedList<T extends PaginatedItem>({
  fetch,
  options,
  heading,
  empty = null,
  loading,
  items = [],
  className,
  renderItem,
  renderError,
  renderHeading,
  onEscape,
  listRef,
  ...rest
}: Props<T>) {
  const { auth } = useStores();
  const { t } = useTranslation();
  
  const [error, setError] = React.useState<Error | undefined>();
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(false);
  const [isFetchingInitial, setIsFetchingInitial] = React.useState(!items?.length);
  const [fetchCounter, setFetchCounter] = React.useState(0);
  const [renderCount, setRenderCount] = React.useState(Pagination.defaultLimit);
  const [offset, setOffset] = React.useState(0);
  const [allowLoadMore, setAllowLoadMore] = React.useState(true);
  
  const reset = React.useCallback(() => {
    setOffset(0);
    setAllowLoadMore(true);
    setRenderCount(Pagination.defaultLimit);
    setIsFetching(false);
    setIsFetchingInitial(false);
    setIsFetchingMore(false);
  }, []);
  
  const fetchResults = React.useCallback(async () => {
    if (!fetch) {
      return;
    }
    
    setIsFetching(true);
    const counter = fetchCounter + 1;
    setFetchCounter(counter);
    const limit = options?.limit ?? Pagination.defaultLimit;
    setError(undefined);
    
    try {
      const results = await fetch({
        limit,
        offset,
        ...options,
      });
      
      if (offset !== 0) {
        setRenderCount((prevCount) => prevCount + limit);
      }
      
      if (results && (results.length === 0 || results.length < limit)) {
        setAllowLoadMore(false);
      } else {
        setOffset((prevOffset) => prevOffset + limit);
      }
      
      setIsFetchingInitial(false);
    } catch (err) {
      setError(err);
    } finally {
      // only the most recent fetch should end the loading state
      if (counter >= fetchCounter) {
        setIsFetching(false);
        setIsFetchingMore(false);
      }
    }
  }, [fetch, fetchCounter, offset, options]);
  
  const loadMoreResults = React.useCallback(async () => {
    // Don't paginate if there aren't more results or we're currently fetching
    if (!allowLoadMore || isFetching) {
      return;
    }
    
    // If there are already cached results that we haven't yet rendered because
    // of lazy rendering then show another page.
    const leftToRender = (items?.length ?? 0) - renderCount;
    
    if (leftToRender > 0) {
      setRenderCount((prevCount) => prevCount + Pagination.defaultLimit);
    }
    
    // If there are less than a pages results in the cache go ahead and fetch
    // another page from the server
    if (leftToRender <= Pagination.defaultLimit) {
      setIsFetchingMore(true);
      await fetchResults();
    }
  }, [allowLoadMore, isFetching, items?.length, renderCount, fetchResults]);
  
  // Equivalent to componentDidMount
  React.useEffect(() => {
    void fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Equivalent to componentDidUpdate
  React.useEffect(() => {
    const prevFetch = React.useRef(fetch);
    const prevOptions = React.useRef(options);
    
    if (
      prevFetch.current !== fetch ||
      !isEqual(prevOptions.current, options)
    ) {
      reset();
      void fetchResults();
    }
    
    prevFetch.current = fetch;
    prevOptions.current = options;
  }, [fetch, options, reset, fetchResults]);
  
  // Computed property equivalent
  const itemsToRender = React.useMemo(() => {
    return items?.slice(0, renderCount) ?? [];
  }, [items, renderCount]);
  
  const showLoading =
    isFetching &&
    !isFetchingMore &&
    (!items?.length || (fetchCounter <= 1 && isFetchingInitial));
  
  if (showLoading) {
    return (
      loading || (
        <DelayedMount>
          <div className={className}>
            <PlaceholderList count={5} />
          </div>
        </DelayedMount>
      )
    );
  }
  
  if (items?.length === 0) {
    if (error && renderError) {
      return renderError({ error, retry: fetchResults });
    }
    
    return empty;
  }
  
  return (
    <>
      {heading}
      <ArrowKeyNavigation
        aria-label={rest["aria-label"]}
        onEscape={onEscape}
        className={className}
        items={itemsToRender}
        ref={listRef}
      >
        {() => {
          let previousHeading = "";
          return itemsToRender.map((item, index) => {
            const children = renderItem(item, index);
            
            // If there is no renderHeading method passed then no date
            // headings are rendered
            if (!renderHeading) {
              return children;
            }
            
            // Our models have standard date fields, updatedAt > createdAt.
            // Get what a heading would look like for this item
            const currentDate =
              "updatedAt" in item && item.updatedAt
                ? item.updatedAt
                : "createdAt" in item && item.createdAt
                ? item.createdAt
                : previousHeading;
            const currentHeading = dateToHeading(
              currentDate,
              t,
              auth.user?.language
            );
            
            // If the heading is different to any previous heading then we
            // should render it, otherwise the item can go under the previous
            // heading
            if (
              children &&
              (!previousHeading || currentHeading !== previousHeading)
            ) {
              previousHeading = currentHeading;
              return (
                <React.Fragment
                  key={"id" in item && item.id ? item.id : index}
                >
                  {renderHeading(currentHeading)}
                  {children}
                </React.Fragment>
              );
            }
            
            return children;
          });
        }}
      </ArrowKeyNavigation>
      {allowLoadMore && (
        <div style={{ height: "1px" }}>
          <Waypoint key={renderCount} onEnter={loadMoreResults} />
        </div>
      )}
    </>
  );
}

export const Component = observer(PaginatedList);

export default observer(PaginatedList);
