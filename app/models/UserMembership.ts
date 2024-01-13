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
  documentId: string;

  /** The document comprising of membership. */
  @Relation(() => Document, { onDelete: "cascade" })
  document: Document;

  /** The ID of the user who is a member */
  userId: string;

  /** The user who is a member */
  @Relation(() => User, { onDelete: "cascade" })
  user: User;

  /** The user that created this membership */
  @Relation(() => User, { onDelete: "null" })
  createdBy: User;

  /** The ID of the user that created this membership */
  createdById: string;

  store: UserMembershipsStore;

  /**
   * Returns the next membership in the list, or undefined if this is the last.
   */
  next(): UserMembership | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }

  /**
   * Returns the previous membership in the list, or undefined if this is the first.
   */
  previous(): UserMembership | undefined {
    const index = this.store.orderedData.indexOf(this);
    return this.store.orderedData[index + 1];
  }
}

export default UserMembership;
