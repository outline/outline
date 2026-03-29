import { useKBar } from "kbar";
import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import * as React from "react";
import Icon from "@shared/components/Icon";
import useShare from "@shared/hooks/useShare";
import { Minute } from "@shared/utils/time";
import { createAction } from "~/actions";
import {
  RecentSearchesSection,
  SearchResultsSection,
} from "~/actions/sections";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import useStores from "~/hooks/useStores";
import type Document from "~/models/Document";
import history from "~/utils/history";
import { sharedModelPath } from "~/utils/routeHelpers";
import type { SearchResult } from "~/types";

interface CacheEntry {
  timestamp: number;
  results: SearchResult[];
}

const cacheTTL = Minute.ms * 5;
const maxRecentDocs = 5;

/**
 * Registers search result actions in the command bar scoped to a public share.
 */
function SharedSearchActions() {
  const { documents } = useStores();
  const { shareId } = useShare();
  const searchCache = React.useRef<Map<string, CacheEntry>>(new Map());
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const recentDocsRef = React.useRef<Document[]>([]);
  const [recentDocs, setRecentDocs] = React.useState<Document[]>([]);

  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }));

  React.useEffect(() => {
    if (!searchQuery || !shareId) {
      setResults([]);
      return;
    }

    const now = Date.now();
    const cachedEntry = searchCache.current.get(searchQuery);
    const isExpired = cachedEntry
      ? now - cachedEntry.timestamp > cacheTTL
      : true;

    if (cachedEntry && !isExpired) {
      setResults(cachedEntry.results);
      return;
    }

    const currentQuery = searchQuery;
    void documents.search({ query: searchQuery, shareId }).then((res) => {
      searchCache.current.set(currentQuery, { timestamp: now, results: res });
      setResults(res);
    });
  }, [documents, searchQuery, shareId]);

  const addRecentDoc = React.useCallback((doc: Document) => {
    const prev = recentDocsRef.current;
    const filtered = prev.filter((d) => d.id !== doc.id);
    const next = [doc, ...filtered].slice(0, maxRecentDocs);
    recentDocsRef.current = next;
    setRecentDocs(next);
  }, []);

  const documentIcon = React.useCallback(
    (doc: Document) =>
      doc.icon ? (
        <Icon
          value={doc.icon}
          initial={doc.initial}
          color={doc.color ?? undefined}
        />
      ) : (
        <DocumentIcon />
      ),
    []
  );

  const actions = React.useMemo(
    () =>
      results.map((result) =>
        createAction({
          id: `shared-search-${result.document.id}`,
          name: result.document.titleWithDefault,
          description: result.context,
          keywords: searchQuery,
          analyticsName: "Open shared search result",
          section: SearchResultsSection,
          icon: documentIcon(result.document),
          perform: () => {
            if (shareId) {
              addRecentDoc(result.document);
              history.push({
                pathname: sharedModelPath(shareId, result.document.url),
                search: searchQuery
                  ? `?q=${encodeURIComponent(searchQuery)}`
                  : undefined,
              });
            }
          },
        })
      ),
    [results, shareId, searchQuery, addRecentDoc, documentIcon]
  );

  const recentDocActions = React.useMemo(
    () =>
      recentDocs.map((doc) =>
        createAction({
          id: `shared-recent-doc-${doc.id}`,
          name: doc.titleWithDefault,
          analyticsName: "Open recent shared document",
          section: RecentSearchesSection,
          icon: documentIcon(doc),
          perform: () => {
            if (shareId) {
              history.push(sharedModelPath(shareId, doc.url));
            }
          },
        })
      ),
    [recentDocs, shareId, documentIcon]
  );

  useCommandBarActions(searchQuery ? actions : recentDocActions, [
    searchQuery
      ? actions.map((a) => a.id).join("")
      : recentDocActions.map((a) => a.id).join(""),
    searchQuery,
  ]);

  return null;
}

export default observer(SharedSearchActions);
