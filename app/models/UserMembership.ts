import { observable } from "mobx";
import { DocumentPermission } from "@shared/types";
import type UserMembershipsStore from "~/stores/UserMembershipsStore";
import Document from "./Document";
import User from "./User";
import Field from "./decorators/Field";
import { AfterRemove } from "./decorators/Lifecycle";
import Relation from "./decorators/Relation";
import NavigableModel from "./base/NavigableModel";

class UserMembership extends NavigableModel {
  static modelName = "UserMembership";

  /** The sort order of the membership (In users sidebar) */
  @Field
  @observable
  index: string;

  /** The permission level granted to the user. */
  @observable
  permission: DocumentPermission;

  /** The document that this membership grants the user access to. */
  @Relation(() => Document, { onDelete: "cascade" })
  document?: Document;

  /** The source ID points to the root membership from which this inherits */
  sourceId?: string;

  /** The source points to the root membership from which this inherits */
  @Relation(() => UserMembership, { onDelete: "cascade" })
  source?: UserMembership;

  /** The user ID that this membership is granted to. */
  userId: string;

  /** The user that this membership is granted to. */
  @Relation(() => User, { onDelete: "cascade" })
  user: User;

  /** The user that created this membership. */
  @Relation(() => User, { onDelete: "null" })
  createdBy: User;

  /** The user ID that created this membership. */
  createdById: string;

  store: UserMembershipsStore;

  // methods

  /**
   * Fetches the child documents structure from the server.
   */
  async fetchDocuments(options: { force?: boolean } = {}) {
    if (!this.documentId) {
      return;
    }

    await super.fetchDocuments({
      path: "/documents.documents",
      params: { id: this.documentId },
      ...options,
    });
  }

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

  // hooks

  @AfterRemove
  public static removeFromPolicies(model: UserMembership) {
    model.store.rootStore.policies.removeForMembership(model.id);
  }
}

export default UserMembership;
