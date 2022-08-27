import { computed } from "mobx";
import { CollectionPermission } from "@shared/types";
import BaseModel from "./BaseModel";

class CollectionGroupMembership extends BaseModel {
  id: string;

  groupId: string;

  collectionId: string;

  permission: CollectionPermission;

  @computed
  get isEditor(): boolean {
    return this.permission === CollectionPermission.ReadWrite;
  }
}

export default CollectionGroupMembership;
