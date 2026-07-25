import { useKBar } from "kbar";
import { observer } from "mobx-react";
import * as React from "react";
import { Minute } from "@shared/utils/time";
import { createInternalLinkAction } from "~/actions";
import { searchDocumentsForQuery } from "~/actions/definitions/documents";
import { navigateToRecentSearchQuery } from "~/actions/definitions/navigation";
import { SearchResultsSection } from "~/actions/sections";
import { SearchResultIcon } from "~/components/CommandBar/SearchResultIcon";
import {
  toActionPriority,
  toSearchRecord,
  useSearchIndex,
} from "~/components/CommandBar/useSearchIndex";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import useStores from "~/hooks/useStores";

const cacheTTL = Minute.ms * 5;
const serverSearchDelay = 350;

function SearchActions() {
  const { searches, documents } = useStores();

  // Tracks the timestamp of the last server search for each query.
  const searchCache = React.useRef<Map<string, number>>(new Map());

  React.useEffect(() => {
    if (!searches.isLoaded && !searches.isFetching) {
      void searches.fetchPage({
        source: "app",
      });
    }
  }, [searches]);

  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }));

  const { results, feed } = useSearchIndex(searchQuery);

  // Seed instant, local fuzzy matches from recently viewed documents.
  React.useEffect(() => {
    feed(documents.recentlyViewed.map((doc) => toSearchRecord(doc)));
  }, [documents.recentlyViewed, feed]);

  // Enrich the index with server title matches, debounced and cached.
  React.useEffect(() => {
    if (!searchQuery) {
      return;
    }

    const cached = searchCache.current.get(searchQuery);
    if (cached && Date.now() - cached < cacheTTL) {
      return;
    }

    const currentQuery = searchQuery;
    let disposed = false;

    const handle = setTimeout(() => {
      void documents
        .searchTitles({ query: currentQuery })
        .then((res) => {
          searchCache.current.set(currentQuery, Date.now());
          if (disposed) {
            return;
          }
          feed(res.map((result) => toSearchRecord(result.document)));
        })
        .catch(() => {
          // Failing to enrich the index is not worth surfacing, local results
          // are still shown.
        });
    }, serverSearchDelay);

    return () => {
      disposed = true;
      clearTimeout(handle);
    };
  }, [documents, searchQuery, feed]);

  const resultActions = React.useMemo(
    () =>
      results.map((result, index) =>
        createInternalLinkAction({
          id: `search-result-${result.document.id}`,
          name: result.document.title,
          description: result.context,
          keywords: searchQuery,
          analyticsName: "Open search result",
          section: SearchResultsSection,
          priority: toActionPriority(index, results.length),
          icon: <SearchResultIcon document={result.document} />,
          to: result.document.url,
        })
      ),
    [results, searchQuery]
  );

  useCommandBarActions(
    searchQuery ? [...resultActions, searchDocumentsForQuery(searchQuery)] : [],
    [resultActions.map((a) => a.id).join(""), searchQuery]
  );

  useCommandBarActions(searches.recent.map(navigateToRecentSearchQuery));

  return null;
}

export default observer(SearchActions);
