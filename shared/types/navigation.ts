export enum NavigationNodeType {
  Collection = "collection",
  Document = "document",
  UserMembership = "userMembership",
  GroupMembership = "groupMembership",
}

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

export type CollectionSort = {
  field: string;
  direction: "asc" | "desc";
};
