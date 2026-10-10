/** Time periods used to filter results by last update. */
export type DateFilter = "day" | "week" | "month" | "year";

/** Document statuses that results can be filtered by. */
export enum StatusFilter {
  Published = "published",
  Archived = "archived",
  Draft = "draft",
}

/** Fields that documents can be sorted by. */
export enum SortFilter {
  CreatedAt = "createdAt",
  UpdatedAt = "updatedAt",
  Title = "title",
}

/** Sort directions. */
export enum DirectionFilter {
  ASC = "ASC",
  DESC = "DESC",
}

/** Model types that support search indexing. */
export enum SearchableModel {
  Document = "document",
  Collection = "collection",
  Comment = "comment",
}

/** Collection statuses that results can be filtered by. */
export enum CollectionStatusFilter {
  Archived = "archived",
}

/** Comment statuses that results can be filtered by. */
export enum CommentStatusFilter {
  Resolved = "resolved",
  Unresolved = "unresolved",
}
