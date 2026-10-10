import { escapeRegExp } from "es-toolkit/compat";
import Fuse, { type IFuseOptions } from "fuse.js";

/** A document as represented within the search index. */
export interface SearchIndexDocument {
  id: string;
  /** Display title, already defaulted for documents without one. */
  title: string;
  /** Plain text content of the document, may be absent until it has loaded. */
  text?: string;
  url: string;
  icon?: string | null;
  color?: string | null;
  /** Whether the document is archived. */
  isArchived?: boolean;
}

/** A single document matched by a search of the index. */
export interface SearchIndexResult {
  document: SearchIndexDocument;
  /** Fuse relevance score, lower is a better match. */
  score: number;
  /** A highlighted snippet of content surrounding the match, if any. */
  context?: string;
}

/** The shortest term considered for matching and highlighting. */
const minTermLength = 2;

/** How directly a title matches the query, ordered most to least direct. */
enum TitleRanking {
  Prefix = 0,
  WordPrefix = 1,
  Fuzzy = 2,
}

const options: IFuseOptions<SearchIndexDocument> = {
  keys: [
    { name: "title", weight: 2 },
    { name: "text", weight: 1 },
  ],
  includeScore: true,
  ignoreLocation: true,
  useTokenSearch: true,
  threshold: 0.3,
  minMatchCharLength: minTermLength,
};

const resultLimit = 25;
const contextLead = 40;
const contextLength = 200;

/**
 * Finds the literal, case-insensitive occurrences of the query — and of each of
 * its terms when it has more than one — within the given text. Fuzzy matching
 * decides *which* documents rank, but only literal matches are worth
 * highlighting, as the underlying fuzzy indices span scattered characters and
 * read as noise.
 *
 * @param text the text to search within.
 * @param query the search query.
 * @returns the matched ranges as start/end offsets, in document order.
 */
function findExactMatches(text: string, query: string): [number, number][] {
  const terms = query
    .split(/\s+/)
    .filter((term) => term.length >= minTermLength);
  const patterns = [query, ...(terms.length > 1 ? terms : [])].map(
    escapeRegExp
  );
  const regex = new RegExp(patterns.join("|"), "gi");

  const ranges: [number, number][] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].length === 0) {
      regex.lastIndex++;
      continue;
    }
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

/**
 * Ranks how directly a title matches the query, so that literal prefix matches
 * can be ordered ahead of fuzzy ones. Fuse scores purely on fuzzy distance and
 * will otherwise rank a typo-tolerant match above a title the user is part-way
 * through typing.
 *
 * @param title the document title.
 * @param query the search query.
 * @returns the ranking, where a lower number is a more direct match.
 */
function getTitleRanking(title: string, query: string): TitleRanking {
  const normalizedTitle = title.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (normalizedTitle.startsWith(normalizedQuery)) {
    return TitleRanking.Prefix;
  }

  // A word within the title starting with the query, e.g. "hand" in
  // "Engineering Handbook".
  const boundary = /^\w/.test(query) ? "\\b" : "";
  if (new RegExp(`${boundary}${escapeRegExp(query)}`, "i").test(title)) {
    return TitleRanking.WordPrefix;
  }

  return TitleRanking.Fuzzy;
}

/**
 * Builds a preview snippet of the document content, trimmed to a short window.
 * When the content contains exact matches for the query the window is centered
 * on the first of them and each match is wrapped in `<b>` tags, otherwise the
 * opening of the content is used unhighlighted.
 *
 * @param text the document content.
 * @param query the search query.
 * @returns the snippet, or undefined when there is no content to preview.
 */
function buildContext(
  text: string | undefined,
  query: string
): string | undefined {
  const trimmedText = text?.trim();
  if (!trimmedText) {
    return undefined;
  }

  const ranges =
    query.length >= minTermLength ? findExactMatches(trimmedText, query) : [];

  // Without a literal match there is nothing worth marking, but the opening of
  // the document still makes a useful preview.
  if (!ranges.length) {
    const excerpt = trimmedText.slice(0, contextLength);
    return excerpt.length < trimmedText.length ? `${excerpt.trim()}…` : excerpt;
  }

  const windowStart = Math.max(0, ranges[0][0] - contextLead);
  const windowEnd = Math.min(trimmedText.length, windowStart + contextLength);

  let out = "";
  let cursor = windowStart;
  for (const [start, end] of ranges) {
    if (end <= windowStart || start >= windowEnd) {
      continue;
    }
    const from = Math.max(start, windowStart);
    const to = Math.min(end, windowEnd);
    if (from > cursor) {
      out += trimmedText.slice(cursor, from);
    }
    out += `<b>${trimmedText.slice(from, to)}</b>`;
    cursor = to;
  }
  if (cursor < windowEnd) {
    out += trimmedText.slice(cursor, windowEnd);
  }

  const prefix = windowStart > 0 ? "…" : "";
  const suffix = windowEnd < trimmedText.length ? "…" : "";
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

      // Preserve previously-indexed content when an update omits text entirely,
      // but respect an update that intentionally clears it to an empty string.
      if (incoming.text === undefined && existing?.text !== undefined) {
        merged.text = existing.text;
      }

      if (
        existing &&
        existing.title === merged.title &&
        existing.text === merged.text &&
        existing.url === merged.url &&
        existing.isArchived === merged.isArchived
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
   * Performs a fuzzy search across indexed titles and content. Titles that the
   * query prefixes are always ordered ahead of purely fuzzy matches, with the
   * fuzzy score breaking ties within each tier.
   *
   * @param query the search query.
   * @returns the matching documents ordered by relevance.
   */
  public search(query: string): SearchIndexResult[] {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    // Building context scans the full text of a document, so it is deferred
    // until the results have been truncated to those actually displayed.
    return this.fuse
      .search(trimmed)
      .map((result) => ({
        document: result.item,
        score: result.score ?? 1,
        ranking: getTitleRanking(result.item.title, trimmed),
      }))
      .sort((a, b) => a.ranking - b.ranking || a.score - b.score)
      .slice(0, resultLimit)
      .map(({ document, score }) => ({
        document,
        score,
        context: buildContext(document.text, trimmed),
      }));
  }
}
