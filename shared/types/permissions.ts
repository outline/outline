/** Access levels that can be granted on a collection. */
export enum CollectionPermission {
  Read = "read",
  ReadWrite = "read_write",
  Admin = "admin",
}

/** Access levels that can be granted on a document. */
export enum DocumentPermission {
  Read = "read",
  ReadWrite = "read_write",
  Admin = "admin",
}

/** Roles that a user can have in a group. */
export enum GroupPermission {
  Member = "member",
  Admin = "admin",
}
