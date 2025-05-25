import isEqual from "lodash/isEqual";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Waypoint } from "react-waypoint";
import { Pagination } from "@shared/constants";
import ArrowKeyNavigation from "~/components/ArrowKeyNavigation";
import DelayedMount from "~/components/DelayedMount";
import PlaceholderList from "~/components/List/Placeholder";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePrevious from "~/hooks/usePrevious";
import { dateToHeading } from "~/utils/date";

/**
 * Base interface for items that can be paginated
 * @interface PaginatedItem
 */
export interface PaginatedItem {
  /** Unique identifier for the item */
  id?: string;
  /** Last update timestamp of the item */
  updatedAt?: string;
  /** Creation timestamp of the item */
  createdAt?: string;
}

/**
 * Props for the PaginatedList component
 * @template T Type of items in the list, must extend PaginatedItem
 */
interface Props<T extends PaginatedItem>
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Function to fetch paginated data. Should return a promise resolving to an array of items
   * @param options Pagination and other query options
   */
  fetch?: (
    options: Record<string, any> | undefined
  ) => Promise<unknown[] | undefined> | undefined;

  /** Additional options to pass to the fetch function */
  options?: Record<string, any>;

  /** Optional header content to display above the list */
  heading?: React.ReactNode;

  /** Content to display when the list is empty */
  empty?: JSX.Element | null;

  /** Optional loading state content */
  loading?: JSX.Element | null;

  /** Array of items to display in the list */
  items?: T[];

  /** CSS class name to apply to the list container */
  className?: string;

  /**
   * Function to render each individual item in the list
   * @param item The item to render
   * @param index The index of the item in the list
   */
  renderItem: (item: T, index: number) => React.ReactNode;

  /**
   * Function to render error state
   * @param options Object containing error details and retry function
   */
  renderError?: (options: {
    /** Details of the error */
    error: Error;
    /** Function to retry the fetch operation */
    retry: () => void;
  }) => JSX.Element;

  /**
   * Function to render section headings (typically date-based)
   * @param name The heading text or element to render
   */
  renderHeading?: (name: React.ReactElement<any> | string) => React.ReactNode;

  /**
   * Handler for escape key press
   * @param ev Keyboard event object
   */
  onEscape?: (ev: React.KeyboardEvent<HTMLDivElement>) => void;

  /** Reference to the list container element */
  listRef?: React.RefObject<HTMLDivElement>;
}

/**
 * A reusable component that renders a paginated list with infinite scrolling
 * and optional date-based section headings.
 *
 * @template T Type of the list items, must extend PaginatedItem
 */
const PaginatedList = <T extends PaginatedItem>({
  fetch,
  options,
  heading,
  empty = null,
  loading = null,
  items = [],
  className,
  renderItem,
  renderError,
  renderHeading,
  onEscape,
  listRef,
  ...rest
}: Props<T>): JSX.Element | null => {
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { t } = useTranslation();

  const [error, setError] = React.useState<Error | undefined>();
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(false);
  const [isFetchingInitial, setIsFetchingInitial] = React.useState(
    !items?.length
  );
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

  const prevFetch = usePrevious(fetch);
  const prevOptions = usePrevious(options);

  // Initial fetch on mount
  React.useEffect(() => {
    if (fetch) {
      void fetchResults();
    }
  }, [fetch]);

  // Handle updates to fetch or options
  React.useEffect(() => {
    if (!prevFetch || !prevOptions) {
      return; // Skip on initial mount since it's handled by the above effect
    }

    if (prevFetch !== fetch || !isEqual(prevOptions, options)) {
      reset();
      void fetchResults();
    }
  }, [fetch, options, reset, fetchResults, prevFetch, prevOptions]);

  // Computed property equivalent
  const itemsToRender = React.useMemo(
    () => items?.slice(0, renderCount) ?? [],
    [items, renderCount]
  );

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
    <React.Fragment>
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
              user?.language
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
                <React.Fragment key={"id" in item && item.id ? item.id : index}>
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
    </React.Fragment>
  );
};

export default PaginatedList;
