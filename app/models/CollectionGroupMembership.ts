import { observable } from "mobx";
import { CollectionPermission } from "@shared/types";
import Model from "./base/Model";

class CollectionGroupMembership extends Model {
  id: string;

  groupId: string;

  collectionId: string;

  @observable
  permission: CollectionPermission;
}

export default CollectionGroupMembership;
