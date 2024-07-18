import { observable } from "mobx";
import { CollectionPermission } from "@shared/types";
import Collection from "./Collection";
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

  /** The collection ID that this membership grants the group access to. */
  collectionId: string | undefined;

  /** The collection that this membership grants the group access to. */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection: Collection | undefined;

  /** The permission level granted to the group. */
  @observable
  permission: CollectionPermission;
}

export default GroupMembership;
