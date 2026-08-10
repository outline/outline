import { useKBar } from "kbar";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Minute } from "@shared/utils/time";
import { createInternalLinkAction } from "~/actions";
import { searchDocumentsForQueryActionFactory } from "~/actions/definitions/documents";
import { navigateToRecentSearchQueryActionFactory } from "~/actions/definitions/navigation";
import { SearchResultsSection } from "~/actions/sections";
import Badge from "~/components/Badge";
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
  const { t } = useTranslation();

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
          if (disposed) {
            return;
          }
          searchCache.current.set(currentQuery, Date.now());
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
          badge: result.document.isArchived ? (
            <Badge>{t("Archived")}</Badge>
          ) : undefined,
          to: result.document.url,
        })
      ),
    [results, searchQuery, t]
  );

  // Enriching the index can change snippets without changing which documents
  // matched, so the key must cover contexts as well as ids.
  const resultsKey = React.useMemo(
    () => results.map((r) => `${r.document.id}:${r.context ?? ""}`).join(""),
    [results]
  );

  useCommandBarActions(
    searchQuery
      ? [...resultActions, searchDocumentsForQueryActionFactory(searchQuery)]
      : [],
    [resultsKey, searchQuery]
  );

  useCommandBarActions(
    searches.recent.map(navigateToRecentSearchQueryActionFactory)
  );

  return null;
}

export default observer(SearchActions);
