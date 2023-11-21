import { observable } from "mobx";
import { DocumentPermission } from "@shared/types";
import type UserMembershipsStore from "~/stores/UserMembershipsStore";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

class UserMembership extends Model {
  static modelName = "UserMembership";

  /** The sort order of the membership */
  @Field
  @observable
  index: string;

  @observable
  permission: DocumentPermission;

  /** The document ID comprising of membership. */
  documentId?: string;

  /** The document comprising of membership. */
  @Relation(() => Document, { onDelete: "cascade" })
  document?: Document;

  /** The user ID of user who is a member */
  userId: string;

  /** The user who is a member */
  @Relation(() => User, { onDelete: "cascade" })
  user: User;

  store: UserMembershipsStore;

  /**
   * Returns the next membership in the list, or undefined if this is the last star.
   */
  next(): UserMembership | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }

  /**
   * Returns the previous star in the list, or undefined if this is the first star.
   */
  previous(): UserMembership | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }
}

export default UserMembership;
