import { observable } from "mobx";
import { CollectionPermission } from "@shared/types";
import BaseModel from "./BaseModel";

class CollectionGroupMembership extends BaseModel {
  id: string;

  groupId: string;

  collectionId: string;

  @observable
  permission: CollectionPermission;
}

export default CollectionGroupMembership;
