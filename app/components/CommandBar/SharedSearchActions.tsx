import { useKBar } from "kbar";
import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import * as React from "react";
import Icon from "@shared/components/Icon";
import useShare from "@shared/hooks/useShare";
import { Minute } from "@shared/utils/time";
import { createAction } from "~/actions";
import { DocumentSection } from "~/actions/sections";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import { sharedModelPath } from "~/utils/routeHelpers";
import type { SearchResult } from "~/types";

interface CacheEntry {
  timestamp: number;
  results: SearchResult[];
}

const cacheTTL = Minute.ms * 5;

/**
 * Registers search result actions in the command bar scoped to a public share.
 */
function SharedSearchActions() {
  const { documents } = useStores();
  const { shareId } = useShare();
  const searchCache = React.useRef<Map<string, CacheEntry>>(new Map());
  const [results, setResults] = React.useState<SearchResult[]>([]);

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

  const actions = React.useMemo(
    () =>
      results.map((result) =>
        createAction({
          id: `shared-search-${result.document.id}`,
          name: result.document.titleWithDefault,
          analyticsName: "Open shared search result",
          section: DocumentSection,
          icon: result.document.icon ? (
            <Icon
              value={result.document.icon}
              initial={result.document.initial}
              color={result.document.color ?? undefined}
            />
          ) : (
            <DocumentIcon />
          ),
          perform: () => {
            if (shareId) {
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
    [results, shareId, searchQuery]
  );

  useCommandBarActions(actions, [actions.map((a) => a.id).join("")]);

  return null;
}

export default observer(SharedSearchActions);
