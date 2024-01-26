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

  /** The sort order of the membership (In users sidebar) */
  @Field
  @observable
  index: string;

  /** The permission level granted to the user. */
  @observable
  permission: DocumentPermission;

  /** The document ID that this permission grants the user access to. */
  documentId?: string;

  /** The document that this permission grants the user access to. */
  @Relation(() => Document, { onDelete: "cascade" })
  document?: Document;

  /** The source ID points to the root permission from which this permission inherits */
  sourceId?: string;

  /** The source points to the root permission from which this permission inherits */
  @Relation(() => UserMembership, { onDelete: "cascade" })
  source?: UserMembership;

  /** The user ID that this permission is granted to. */
  userId: string;

  /** The user that this permission is granted to. */
  @Relation(() => User, { onDelete: "cascade" })
  user: User;

  /** The user that created this permission. */
  @Relation(() => User, { onDelete: "null" })
  createdBy: User;

  /** The user ID that created this permission. */
  createdById: string;

  store: UserMembershipsStore;

  /**
   * Returns the next membership for the same user in the list, or undefined if this is the last.
   */
  next(): UserMembership | undefined {
    const memberships = this.store.filter({
      userId: this.userId,
    });
    const index = memberships.indexOf(this);
    return memberships[index + 1];
  }

  /**
   * Returns the previous membership for the same user in the list, or undefined if this is the first.
   */
  previous(): UserMembership | undefined {
    const memberships = this.store.filter({
      userId: this.userId,
    });
    const index = memberships.indexOf(this);
    return memberships[index + 1];
  }
}

export default UserMembership;
