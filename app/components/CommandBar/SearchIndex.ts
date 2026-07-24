import Fuse from "fuse.js";

export interface SearchIndexDocument {
  id: string;
  title: string;
  /** Plain text content of the document, may be absent until it has loaded. */
  text?: string;
  url: string;
  icon?: string | null;
  color?: string | null;
}

export interface SearchIndexResult {
  document: SearchIndexDocument;
  /** Fuse relevance score, lower is a better match. */
  score: number;
  /** A highlighted snippet of content surrounding the match, if any. */
  context?: string;
}

const options: Fuse.IFuseOptions<SearchIndexDocument> = {
  keys: [
    { name: "title", weight: 2 },
    { name: "text", weight: 1 },
  ],
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  threshold: 0.3,
  minMatchCharLength: 2,
};

const resultLimit = 25;
const contextLead = 40;
const contextLength = 200;

/**
 * Builds a highlighted context snippet from the matched content indices,
 * wrapping matched ranges in `<b>` tags and trimming to a short window around
 * the first match.
 *
 * @param matches the Fuse matches for a single result.
 * @returns the highlighted snippet, or undefined when there is no content match.
 */
function buildContext(
  matches: ReadonlyArray<Fuse.FuseResultMatch> | undefined
): string | undefined {
  const match = matches?.find(
    (m) => m.key === "text" && m.value && m.indices.length > 0
  );
  if (!match?.value) {
    return undefined;
  }

  const value = match.value;
  const indices = [...match.indices].sort((a, b) => a[0] - b[0]);
  const windowStart = Math.max(0, indices[0][0] - contextLead);
  const windowEnd = Math.min(value.length, windowStart + contextLength);

  let out = "";
  let cursor = windowStart;
  for (const [start, end] of indices) {
    if (end < windowStart || start >= windowEnd) {
      continue;
    }
    const from = Math.max(start, windowStart);
    const to = Math.min(end + 1, windowEnd);
    if (from > cursor) {
      out += value.slice(cursor, from);
    }
    out += `<b>${value.slice(from, to)}</b>`;
    cursor = to;
  }
  if (cursor < windowEnd) {
    out += value.slice(cursor, windowEnd);
  }

  const prefix = windowStart > 0 ? "…" : "";
  const suffix = windowEnd < value.length ? "…" : "";
  return `${prefix}${out.trim()}${suffix}`;
}

/**
 * An in-memory fuzzy search index over a set of documents, backed by Fuse.js.
 * Records are merged by id over time so that titles (known upfront) and content
 * (loaded lazily or returned by the server) can progressively enrich the index.
 */
export class SearchIndex {
  private records = new Map<string, SearchIndexDocument>();
  private fuse = new Fuse<SearchIndexDocument>([], options);

  /**
   * Merges documents into the index, rebuilding the collection only when
   * something changed. Existing content text is preserved when an incoming
   * record has none, so partial updates never discard richer data.
   *
   * @param documents the documents to add or update.
   * @returns whether the indexed collection changed as a result.
   */
  public update(documents: SearchIndexDocument[]): boolean {
    let changed = false;

    for (const incoming of documents) {
      const existing = this.records.get(incoming.id);
      const merged: SearchIndexDocument = existing
        ? { ...existing, ...incoming }
        : incoming;

      if (existing?.text && !incoming.text) {
        merged.text = existing.text;
      }

      if (
        existing &&
        existing.title === merged.title &&
        existing.text === merged.text &&
        existing.url === merged.url
      ) {
        continue;
      }

      this.records.set(incoming.id, merged);
      changed = true;
    }

    if (changed) {
      this.fuse.setCollection(Array.from(this.records.values()));
    }

    return changed;
  }

  /**
   * Removes all documents from the index.
   */
  public clear(): void {
    this.records.clear();
    this.fuse.setCollection([]);
  }

  /**
   * Performs a fuzzy search across indexed titles and content.
   *
   * @param query the search query.
   * @returns the matching documents ordered by relevance.
   */
  public search(query: string): SearchIndexResult[] {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    return this.fuse.search(trimmed, { limit: resultLimit }).map((result) => ({
      document: result.item,
      score: result.score ?? 1,
      context: buildContext(result.matches),
    }));
  }
}
