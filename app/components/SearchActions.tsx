import { useKBar } from "kbar";
import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import * as React from "react";
import Icon from "@shared/components/Icon";
import { Minute } from "@shared/utils/time";
import { createInternalLinkAction } from "~/actions";
import { searchDocumentsForQuery } from "~/actions/definitions/documents";
import { navigateToRecentSearchQuery } from "~/actions/definitions/navigation";
import { SearchResultsSection } from "~/actions/sections";
import type { SearchIndexDocument } from "~/components/CommandBar/SearchIndex";
import {
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

    const now = Date.now();
    const cached = searchCache.current.get(searchQuery);
    if (cached && now - cached < cacheTTL) {
      return;
    }

    const currentQuery = searchQuery;
    const handle = setTimeout(() => {
      void documents.searchTitles({ query: currentQuery }).then((res) => {
        searchCache.current.set(currentQuery, now);
        feed(res.map((result) => toSearchRecord(result.document)));
      });
    }, serverSearchDelay);

    return () => clearTimeout(handle);
  }, [documents, searchQuery, feed]);

  const documentIcon = React.useCallback(
    (doc: SearchIndexDocument) =>
      doc.icon ? (
        <Icon
          value={doc.icon}
          initial={doc.title.slice(0, 1)}
          color={doc.color ?? undefined}
        />
      ) : (
        <DocumentIcon />
      ),
    []
  );

  const resultActions = React.useMemo(
    () =>
      results.map((result) =>
        createInternalLinkAction({
          id: `search-result-${result.document.id}`,
          name: result.document.title,
          description: result.context,
          keywords: searchQuery,
          analyticsName: "Open search result",
          section: SearchResultsSection,
          icon: documentIcon(result.document),
          to: result.document.url,
        })
      ),
    [results, searchQuery, documentIcon]
  );

  useCommandBarActions(
    searchQuery ? [...resultActions, searchDocumentsForQuery(searchQuery)] : [],
    [resultActions.map((a) => a.id).join(""), searchQuery]
  );

  useCommandBarActions(searches.recent.map(navigateToRecentSearchQuery));

  return null;
}

export default observer(SearchActions);
