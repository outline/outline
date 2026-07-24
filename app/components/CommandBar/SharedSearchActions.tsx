import { useKBar } from "kbar";
import { autorun } from "mobx";
import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import * as React from "react";
import Icon from "@shared/components/Icon";
import useShare from "@shared/hooks/useShare";
import { NavigationNodeType, type NavigationNode } from "@shared/types";
import { createAction } from "~/actions";
import {
  RecentSearchesSection,
  SearchResultsSection,
} from "~/actions/sections";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import useStores from "~/hooks/useStores";
import type Document from "~/models/Document";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";
import history from "~/utils/history";
import { sharedModelPath } from "~/utils/routeHelpers";
import {
  SharedSearchIndex,
  type SharedSearchDocument,
  type SharedSearchResult,
} from "~/utils/SharedSearchIndex";

const maxRecentDocs = 5;
const serverSearchDelay = 350;
const plainTextCache = new Map<string, string>();

/**
 * Returns the plain text content of a document, memoized by its last update so
 * that repeated indexing passes do not reparse unchanged ProseMirror data.
 */
function getPlainText(doc: Document): string {
  const key = `${doc.id}:${doc.updatedAt ?? ""}`;
  const cached = plainTextCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const text = ProsemirrorHelper.toPlainText(doc);
  plainTextCache.set(key, text);
  return text;
}

/** Removes server-generated `<b>` highlight tags from a context snippet. */
function stripHighlightTags(context: string | undefined): string | undefined {
  return context?.replace(/<b\b[^>]*>(.*?)<\/b>/gi, "$1");
}

/** Collects every non-collection node from a shared navigation tree. */
function collectDocumentNodes(root: NavigationNode): NavigationNode[] {
  const nodes: NavigationNode[] = [];
  const walk = (node: NavigationNode) => {
    if (node.type !== NavigationNodeType.Collection) {
      nodes.push(node);
    }
    node.children?.forEach(walk);
  };
  walk(root);
  return nodes;
}

/**
 * Registers search result actions in the command bar scoped to a public share.
 * Results are driven entirely by a client-side Fuse index — providing fuzzy,
 * typo-tolerant matching — which is progressively fed by document titles from
 * the shared tree, the content of loaded documents, and server responses.
 */
function SharedSearchActions() {
  const { documents } = useStores();
  const { shareId, sharedTree } = useShare();
  const index = React.useMemo(() => new SharedSearchIndex(), [shareId]);

  const recentDocsRef = React.useRef<SharedSearchDocument[]>([]);
  const [recentDocs, setRecentDocs] = React.useState<SharedSearchDocument[]>(
    []
  );
  // Bumped whenever the index changes, to re-run the memoized search below.
  const [version, setVersion] = React.useState(0);

  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }));

  const searchQueryRef = React.useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  // Compute results synchronously during render so the displayed matches never
  // lag behind the query. Recomputed when the query or the index changes.
  const results = React.useMemo<SharedSearchResult[]>(
    () => (searchQuery && shareId ? index.search(searchQuery) : []),
    [index, searchQuery, shareId, version]
  );

  // Feed the index with titles from the shared tree and content from any
  // documents that have loaded into the store, re-running as documents load.
  React.useEffect(() => {
    if (!sharedTree) {
      return;
    }

    const nodes = collectDocumentNodes(sharedTree);

    return autorun(() => {
      const changed = index.update(
        nodes.map((node) => {
          const doc = documents.get(node.id);
          return {
            id: node.id,
            title: doc?.titleWithDefault ?? node.title,
            url: doc?.url ?? node.url,
            text: doc?.data ? getPlainText(doc) : undefined,
            icon: doc?.icon ?? node.icon,
            color: doc?.color ?? node.color,
          };
        })
      );

      if (changed) {
        setVersion((v) => v + 1);
      }
    });
  }, [documents, sharedTree, index]);

  // Enrich the index from the server so that content we have not loaded
  // client-side can still surface, then re-run the memoized search.
  React.useEffect(() => {
    if (!searchQuery || !shareId) {
      return;
    }

    const currentQuery = searchQuery;
    const handle = setTimeout(() => {
      void documents.search({ query: currentQuery, shareId }).then((res) => {
        const changed = index.update(
          res.map((result) => ({
            id: result.document.id,
            title: result.document.titleWithDefault,
            url: result.document.url,
            text: result.document.data
              ? getPlainText(result.document)
              : stripHighlightTags(result.context),
            icon: result.document.icon,
            color: result.document.color,
          }))
        );
        if (changed) {
          setVersion((v) => v + 1);
        }
      });
    }, serverSearchDelay);

    return () => clearTimeout(handle);
  }, [documents, searchQuery, shareId, index]);

  const addRecentDoc = React.useCallback((doc: SharedSearchDocument) => {
    const filtered = recentDocsRef.current.filter((d) => d.id !== doc.id);
    const next = [doc, ...filtered].slice(0, maxRecentDocs);
    recentDocsRef.current = next;
    setRecentDocs(next);
  }, []);

  const documentIcon = React.useCallback(
    (doc: SharedSearchDocument) =>
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

  const actions = React.useMemo(
    () =>
      results.map((result) =>
        createAction({
          id: `shared-search-${result.document.id}`,
          name: result.document.title,
          description: result.context,
          keywords: searchQuery,
          analyticsName: "Open shared search result",
          section: SearchResultsSection,
          icon: documentIcon(result.document),
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
    [results, shareId, searchQuery, addRecentDoc, documentIcon]
  );

  const recentDocActions = React.useMemo(
    () =>
      recentDocs.map((doc) =>
        createAction({
          id: `shared-recent-doc-${doc.id}`,
          name: doc.title,
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
