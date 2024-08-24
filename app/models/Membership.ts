import { observable } from "mobx";
import { CollectionPermission } from "@shared/types";
import Collection from "./Collection";
import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

class Membership extends Model {
  static modelName = "Membership";

  id: string;

  userId: string;

  @Relation(() => User, { onDelete: "cascade" })
  user: User;

  collectionId: string;

  @Relation(() => Collection, { onDelete: "cascade" })
  collection: Collection;

  @observable
  permission: CollectionPermission;
}

export default Membership;
