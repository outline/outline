import { observable } from "mobx";
import { CollectionPermission } from "@shared/types";
import BaseModel from "./BaseModel";

class Membership extends BaseModel {
  id: string;

  userId: string;

  collectionId: string;

  @observable
  permission: CollectionPermission;
}

export default Membership;
