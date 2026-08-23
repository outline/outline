import { useKBar } from "kbar";
import { autorun } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import useShare from "@shared/hooks/useShare";
import { NavigationNodeType, type NavigationNode } from "@shared/types";
import { flattenTree } from "@shared/utils/tree";
import { createAction } from "~/actions";
import {
  RecentSearchesSection,
  SearchResultsSection,
} from "~/actions/sections";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import { sharedModelPath } from "~/utils/routeHelpers";
import type { SearchIndexNote } from "./SearchIndex";
import { SearchResultIcon } from "./SearchResultIcon";
import {
  toActionPriority,
  toSearchRecord,
  useSearchIndex,
} from "./useSearchIndex";
const maxRecentNotes = 5;
const serverSearchDelay = 350;
/**
 * A shared tree is rooted at the collection for collection shares, and at a
 * note for note shares – only the latter are searchable.
 */
const isNoteNode = (node: NavigationNode) =>
  node.type !== NavigationNodeType.Notebook;
/**
 * Registers search result actions in the command bar scoped to a public share.
 * Results are driven entirely by a client-side fuzzy index — providing
 * typo-tolerant matching — which is progressively fed by note titles from
 * the shared tree, the content of loaded notes, and server responses.
 */
function SharedSearchActions() {
  const { t } = useTranslation();
  const { notes } = useStores();
  const { shareId, sharedTree } = useShare();
  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }));
  const searchQueryRef = React.useRef(searchQuery);
  searchQueryRef.current = searchQuery;
  const { results, feed, reset } = useSearchIndex(searchQuery);
  const recentNotesRef = React.useRef<SearchIndexNote[]>([]);
  const [recentNotes, setRecentNotes] = React.useState<SearchIndexNote[]>([]);
  // Start from a clean index whenever the share changes.
  React.useEffect(() => {
    reset();
  }, [reset, shareId]);
  // Feed the index with titles from the shared tree and content from any
  // notes that have loaded into the store, re-running as notes load.
  React.useEffect(() => {
    if (!sharedTree) {
      return;
    }
    const nodes = flattenTree(sharedTree).filter(isNoteNode);
    return autorun(() => {
      feed(
        nodes.map((node) => {
          const doc = notes.get(node.id);
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
  }, [notes, sharedTree, feed, t]);
  // Enrich the index from the server so that content we have not loaded
  // client-side can still surface.
  React.useEffect(() => {
    if (!searchQuery || !shareId) {
      return;
    }
    const currentQuery = searchQuery;
    let disposed = false;
    const handle = setTimeout(() => {
      void notes
        .search({ query: currentQuery, shareId })
        .then((res) => {
          if (disposed) {
            return;
          }
          feed(
            res.map((result) => toSearchRecord(result.note, result.context))
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
  }, [notes, searchQuery, shareId, feed]);
  const addRecentNote = React.useCallback((doc: SearchIndexNote) => {
    const filtered = recentNotesRef.current.filter((d) => d.id !== doc.id);
    const next = [doc, ...filtered].slice(0, maxRecentNotes);
    recentNotesRef.current = next;
    setRecentNotes(next);
  }, []);
  const actions = React.useMemo(
    () =>
      results.map((result, index) =>
        createAction({
          id: `shared-search-${result.note.id}`,
          name: result.note.title,
          description: result.context,
          keywords: searchQuery,
          analyticsName: "Open shared search result",
          section: SearchResultsSection,
          priority: toActionPriority(index, results.length),
          icon: <SearchResultIcon note={result.note} />,
          perform: () => {
            if (shareId) {
              const currentQuery = searchQueryRef.current;
              addRecentNote(result.note);
              history.push({
                pathname: sharedModelPath(shareId, result.note.url),
                search: currentQuery
                  ? `?q=${encodeURIComponent(currentQuery)}`
                  : undefined,
              });
            }
          },
        })
      ),
    [results, shareId, searchQuery, addRecentNote]
  );
  const recentNoteActions = React.useMemo(
    () =>
      recentNotes.map((doc) =>
        createAction({
          id: `shared-recent-doc-${doc.id}`,
          name: doc.title,
          analyticsName: "Open recent shared document",
          section: RecentSearchesSection,
          icon: <SearchResultIcon note={doc} />,
          perform: () => {
            if (shareId) {
              history.push(sharedModelPath(shareId, doc.url));
            }
          },
        })
      ),
    [recentNotes, shareId]
  );
  // Enriching the index can change snippets without changing which notes
  // matched, so the key must cover contexts as well as ids.
  const resultsKey = React.useMemo(
    () => results.map((r) => `${r.note.id}:${r.context ?? ""}`).join(""),
    [results]
  );
  useCommandBarActions(searchQuery ? actions : recentNoteActions, [
    searchQuery ? resultsKey : recentNoteActions.map((a) => a.id).join(""),
    searchQuery,
  ]);
  return null;
}
export default observer(SharedSearchActions);
