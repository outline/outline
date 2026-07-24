import { useCallback, useMemo, useRef, useState } from "react";
import type Document from "~/models/Document";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";
import {
  SearchIndex,
  type SearchIndexDocument,
  type SearchIndexResult,
} from "./SearchIndex";

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

/**
 * Builds an index record from a document model, using its content when loaded
 * and otherwise falling back to a server-provided context snippet.
 *
 * @param doc the document to index.
 * @param context an optional server search context snippet to use as content.
 * @returns the index record.
 */
export function toSearchRecord(
  doc: Document,
  context?: string
): SearchIndexDocument {
  return {
    id: doc.id,
    title: doc.titleWithDefault,
    url: doc.url,
    text: doc.data ? getPlainText(doc) : stripHighlightTags(context),
    icon: doc.icon,
    color: doc.color,
  };
}

export interface UseSearchIndex {
  /** Fuzzy matches for the current query, ordered by relevance. */
  results: SearchIndexResult[];
  /** Merges documents into the index, re-running the search if anything changed. */
  feed: (documents: SearchIndexDocument[]) => void;
  /** Empties the index. */
  reset: () => void;
}

/**
 * Maintains a client-side fuzzy search index and searches it for the given
 * query. The index is fed incrementally via the returned `feed` function, and
 * results are computed synchronously so they never lag behind the query.
 *
 * @param query the current search query.
 * @returns the current results and functions to feed or reset the index.
 */
export function useSearchIndex(query: string): UseSearchIndex {
  const indexRef = useRef<SearchIndex>();
  if (!indexRef.current) {
    indexRef.current = new SearchIndex();
  }
  const index = indexRef.current;

  // Bumped whenever the index changes, to re-run the memoized search below.
  const [version, setVersion] = useState(0);

  const feed = useCallback(
    (documents: SearchIndexDocument[]) => {
      if (index.update(documents)) {
        setVersion((v) => v + 1);
      }
    },
    [index]
  );

  const reset = useCallback(() => {
    index.clear();
    setVersion((v) => v + 1);
  }, [index]);

  const results = useMemo<SearchIndexResult[]>(
    () => (query ? index.search(query) : []),
    [index, query, version]
  );

  return { results, feed, reset };
}
