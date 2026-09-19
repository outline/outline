import { useKBar } from "kbar";
import { autorun } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import useShare from "@shared/hooks/useShare";
import { NavigationNodeType, type NavigationNode } from "@shared/types";
import { flattenTree } from "@shared/utils/tree";
import { createAction } from "~/actions";
import { RecentSection, SearchResultsSection } from "~/actions/sections";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import { sharedModelPath } from "~/utils/routeHelpers";
import type { SearchIndexDocument } from "./SearchIndex";
import { SearchResultIcon } from "./SearchResultIcon";
import {
  toActionPriority,
  toSearchRecord,
  useSearchIndex,
} from "./useSearchIndex";

const maxRecentDocs = 5;
const serverSearchDelay = 350;

/**
 * A shared tree is rooted at the collection for collection shares, and at a
 * document for document shares – only the latter are searchable.
 */
const isDocumentNode = (node: NavigationNode) =>
  node.type !== NavigationNodeType.Collection;

/**
 * Registers search result actions in the command bar scoped to a public share.
 * Results are driven entirely by a client-side fuzzy index — providing
 * typo-tolerant matching — which is progressively fed by document titles from
 * the shared tree, the content of loaded documents, and server responses.
 */
function SharedSearchActions() {
  const { t } = useTranslation();
  const { documents } = useStores();
  const { shareId, sharedTree } = useShare();

  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }));

  const searchQueryRef = React.useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const { results, feed, reset } = useSearchIndex(searchQuery);

  const recentDocsRef = React.useRef<SearchIndexDocument[]>([]);
  const [recentDocs, setRecentDocs] = React.useState<SearchIndexDocument[]>([]);

  // Start from a clean index whenever the share changes.
  React.useEffect(() => {
    reset();
  }, [reset, shareId]);

  // Feed the index with titles from the shared tree and content from any
  // documents that have loaded into the store, re-running as documents load.
  React.useEffect(() => {
    if (!sharedTree) {
      return;
    }

    const nodes = flattenTree(sharedTree).filter(isDocumentNode);

    return autorun(() => {
      feed(
        nodes.map((node) => {
          const doc = documents.get(node.id);
          return doc
            ? toSearchRecord(doc)
            : {
                id: node.id,
                title: node.title || t("Untitled"),
                url: node.url,
                icon: node.icon,
                color: node.color,
              };
        })
      );
    });
  }, [documents, sharedTree, feed, t]);

  // Enrich the index from the server so that content we have not loaded
  // client-side can still surface.
  React.useEffect(() => {
    if (!searchQuery || !shareId) {
      return;
    }

    const currentQuery = searchQuery;
    let disposed = false;

    const handle = setTimeout(() => {
      void documents
        .search({ query: currentQuery, shareId })
        .then((res) => {
          if (disposed) {
            return;
          }
          feed(
            res.map((result) => toSearchRecord(result.document, result.context))
          );
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
  }, [documents, searchQuery, shareId, feed]);

  const addRecentDoc = React.useCallback((doc: SearchIndexDocument) => {
    const filtered = recentDocsRef.current.filter((d) => d.id !== doc.id);
    const next = [doc, ...filtered].slice(0, maxRecentDocs);
    recentDocsRef.current = next;
    setRecentDocs(next);
  }, []);

  const actions = React.useMemo(
    () =>
      results.map((result, index) =>
        createAction({
          id: `shared-search-${result.document.id}`,
          name: result.document.title,
          description: result.context,
          keywords: searchQuery,
          analyticsName: "Open shared search result",
          section: SearchResultsSection,
          priority: toActionPriority(index, results.length),
          icon: <SearchResultIcon document={result.document} />,
          perform: () => {
            if (shareId) {
              const currentQuery = searchQueryRef.current;
              addRecentDoc(result.document);
              history.push({
                pathname: sharedModelPath(shareId, result.document.url),
                search: currentQuery
                  ? `?q=${encodeURIComponent(currentQuery)}`
                  : undefined,
              });
            }
          },
        })
      ),
    [results, shareId, searchQuery, addRecentDoc]
  );

  const recentDocActions = React.useMemo(
    () =>
      recentDocs.map((doc) =>
        createAction({
          id: `shared-recent-doc-${doc.id}`,
          name: doc.title,
          analyticsName: "Open recent shared document",
          section: RecentSection,
          icon: <SearchResultIcon document={doc} />,
          perform: () => {
            if (shareId) {
              history.push(sharedModelPath(shareId, doc.url));
            }
          },
        })
      ),
    [recentDocs, shareId]
  );

  // Enriching the index can change snippets without changing which documents
  // matched, so the key must cover contexts as well as ids.
  const resultsKey = React.useMemo(
    () => results.map((r) => `${r.document.id}:${r.context ?? ""}`).join(""),
    [results]
  );

  useCommandBarActions(searchQuery ? actions : recentDocActions, [
    searchQuery ? resultsKey : recentDocActions.map((a) => a.id).join(""),
    searchQuery,
  ]);

  return null;
}

export default observer(SharedSearchActions);
