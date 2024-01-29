import { observable } from "mobx";
import { CollectionPermission } from "@shared/types";
import Collection from "./Collection";
import Group from "./Group";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

class CollectionGroupMembership extends Model {
  static modelName = "CollectionGroupMembership";

  id: string;

  groupId: string;

  @Relation(() => Group, { onDelete: "cascade" })
  group: Group;

  collectionId: string;

  @Relation(() => Collection, { onDelete: "cascade" })
  collection: Collection;

  @observable
  permission: CollectionPermission;
}

export default CollectionGroupMembership;
