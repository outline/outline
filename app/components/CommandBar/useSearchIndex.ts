import { useCallback, useMemo, useRef, useState } from "react";
import type Document from "~/models/Document";
import { LRUCache } from "@shared/utils/LRUCache";
import { ProsemirrorHelper as SharedProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";
import {
  SearchIndex,
  type SearchIndexDocument,
  type SearchIndexResult,
} from "./SearchIndex";

interface DocumentContent {
  text: string;
  headings: string[];
}

const contentCache = new LRUCache<{ updatedAt: string } & DocumentContent>({
  max: 100,
  storage: "memory",
});

/**
 * Returns the plain text and heading texts of a document, memoized so that
 * repeated indexing passes do not reparse unchanged ProseMirror data. The cache
 * holds at most one entry per document, invalidated when the document is
 * edited, and is bounded to the most recently used documents.
 */
function getContent(doc: Document): DocumentContent {
  const updatedAt = String(doc.updatedAt ?? "");
  const cached = contentCache.get(doc.id);
  if (cached?.updatedAt === updatedAt) {
    return cached;
  }
  const node = ProsemirrorHelper.toNode(doc);
  const content = {
    text: SharedProsemirrorHelper.toPlainText(node),
    headings: SharedProsemirrorHelper.getHeadings(node).map(
      (heading) => heading.title
    ),
  };
  contentCache.set(doc.id, { updatedAt, ...content });
  return content;
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
  const content = doc.data ? getContent(doc) : undefined;

  return {
    id: doc.id,
    title: doc.displayTitle,
    url: doc.url,
    text: content ? content.text : stripHighlightTags(context),
    headings: content?.headings,
    icon: doc.icon,
    color: doc.color,
    isArchived: doc.isArchived,
  };
}

/**
 * Returns the command bar priority that preserves a result's position in the
 * list. The command bar re-ranks registered actions with its own fuzzy matcher
 * and orders each section by `priority + score`, where score never spans more
 * than 0.5 — so a step of one per position keeps our ordering intact.
 *
 * @param index the position of the result.
 * @param total the total number of results.
 * @returns the priority to assign to the action.
 */
export function toActionPriority(index: number, total: number): number {
  return total - index;
}

export interface UseSearchIndex {
  /** Fuzzy matches for the current query, ordered by relevance. */
  results: SearchIndexResult[];
  /** Merges documents into the index, re-running the search if anything changed. */
  feed: (documents: SearchIndexDocument[]) => void;
  /** Empties the index and any cached document content. */
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
  const indexRef = useRef<SearchIndex | undefined>(undefined);
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
    contentCache.clear();
    setVersion((v) => v + 1);
  }, [index]);

  const results = useMemo<SearchIndexResult[]>(
    () => (query ? index.search(query) : []),
    // The index mutates in place, so `version` is what marks the memo stale.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [index, query, version]
  );

  return { results, feed, reset };
}
