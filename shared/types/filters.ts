export type DateFilter = "day" | "week" | "month" | "year";

export enum StatusFilter {
  Published = "published",
  Archived = "archived",
  Draft = "draft",
}

export enum SortFilter {
  CreatedAt = "createdAt",
  UpdatedAt = "updatedAt",
  Title = "title",
}

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

export enum CollectionStatusFilter {
  Archived = "archived",
}

export enum CommentStatusFilter {
  Resolved = "resolved",
  Unresolved = "unresolved",
}
