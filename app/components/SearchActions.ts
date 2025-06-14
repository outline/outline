import { useKBar } from "kbar";
import { useEffect, useRef } from "react";
import { Minute } from "@shared/utils/time";
import { searchDocumentsForQuery } from "~/actions/definitions/documents";
import { navigateToRecentSearchQuery } from "~/actions/definitions/navigation";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import useStores from "~/hooks/useStores";

// Type for cache entries
interface CacheEntry {
  timestamp: number;
}

// Cache configuration
const cacheTTL = Minute.ms * 5;

export default function SearchActions() {
  const { searches, documents } = useStores();

  // Cache structure: Map of search queries to timestamp of last search
  const searchCache = useRef<Map<string, CacheEntry>>(new Map());

  useEffect(() => {
    if (!searches.isLoaded && !searches.isFetching) {
      void searches.fetchPage({
        source: "app",
      });
    }
  }, [searches]);

  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }));

  // Search for matching documents
  useEffect(() => {
    if (searchQuery) {
      const now = Date.now();
      const cachedEntry = searchCache.current.get(searchQuery);
      const isExpired = cachedEntry
        ? now - cachedEntry.timestamp > cacheTTL
        : true;

      if (!cachedEntry || isExpired) {
        void documents.searchTitles({ query: searchQuery }).then(() => {
          searchCache.current.set(searchQuery, { timestamp: now });
        });
      }
    }
  }, [documents, searchQuery]);

  useCommandBarActions(
    searchQuery ? [searchDocumentsForQuery(searchQuery)] : [],
    [searchQuery]
  );

  useCommandBarActions(searches.recent.map(navigateToRecentSearchQuery));

  return null;
}
