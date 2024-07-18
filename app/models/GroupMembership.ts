import { observable } from "mobx";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import Collection from "./Collection";
import Document from "./Document";
import Group from "./Group";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

/**
 * Represents a groups's membership to a collection or document.
 */
class GroupMembership extends Model {
  static modelName = "GroupMembership";

  /** The group ID that this membership is granted to. */
  groupId: string;

  /** The group that this membership is granted to. */
  @Relation(() => Group, { onDelete: "cascade" })
  group: Group;

  /** The document ID that this membership grants the group access to. */
  documentId: string | undefined;

  /** The document that this membership grants the group access to. */
  @Relation(() => Document, { onDelete: "cascade" })
  document: Document | undefined;

  /** The collection ID that this membership grants the group access to. */
  collectionId: string | undefined;

  /** The collection that this membership grants the group access to. */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection: Collection | undefined;

  /** The permission level granted to the group. */
  @observable
  permission: CollectionPermission | DocumentPermission;
}

export default GroupMembership;
