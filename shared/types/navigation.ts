/** The kinds of node in a navigation tree. */
export enum NavigationNodeType {
  Collection = "collection",
  Document = "document",
  /** The root of the acting user's own personal documents. */
  Personal = "personal",
  UserMembership = "userMembership",
  GroupMembership = "groupMembership",
}

/** A node in a navigation tree, such as a collection's document structure. */
export type NavigationNode = {
  id: string;
  title: string;
  url: string;
  emoji?: string;
  icon?: string;
  color?: string;
  children: NavigationNode[];
  isDraft?: boolean;
  collectionId?: string;
  type?: NavigationNodeType;
  parent?: NavigationNode | null;
  depth?: number;
};

/** The sort order of documents in a collection. */
export type CollectionSort = {
  field: string;
  direction: "asc" | "desc";
};
