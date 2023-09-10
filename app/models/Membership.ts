import { observable } from "mobx";
import { CollectionPermission } from "@shared/types";
import Model from "./base/Model";

class Membership extends Model {
  id: string;

  userId: string;

  collectionId: string;

  @observable
  permission: CollectionPermission;
}

export default Membership;
