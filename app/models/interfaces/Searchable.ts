/**
 * An interface for objects that can be searched.
 */
export interface Searchable {
  /** The content to be used for search */
  get searchContent(): string | string[];
}
