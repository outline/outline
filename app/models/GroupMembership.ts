import { observable } from "mobx";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import Collection from "./Collection";
import Document from "./Document";
import Group from "./Group";
import { AfterRemove } from "./decorators/Lifecycle";
import Relation from "./decorators/Relation";
import NavigableModel from "./base/NavigableModel";

/**
 * Represents a groups's membership to a collection or document.
 */
class GroupMembership extends NavigableModel {
  static modelName = "GroupMembership";

  /** The group ID that this membership is granted to. */
  groupId: string;

  /** The group that this membership is granted to. */
  @Relation(() => Group, { onDelete: "cascade" })
  group: Group;

  /** The document that this membership grants the group access to. */
  @Relation(() => Document, { onDelete: "cascade" })
  document: Document | undefined;

  /** The collection ID that this membership grants the group access to. */
  collectionId: string | undefined;

  /** The collection that this membership grants the group access to. */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection: Collection | undefined;

  /** The source ID points to the root membership from which this inherits */
  sourceId?: string;

  /** The source points to the root membership from which this inherits */
  @Relation(() => GroupMembership, { onDelete: "cascade" })
  source?: GroupMembership;

  /** The permission level granted to the group. */
  @observable
  permission: CollectionPermission | DocumentPermission;

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

  // hooks

  @AfterRemove
  public static removeFromPolicies(model: GroupMembership) {
    model.store.rootStore.policies.removeForMembership(model.id);
  }
}

export default GroupMembership;
