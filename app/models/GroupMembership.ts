import invariant from "invariant";
import { action, observable, runInAction } from "mobx";
import {
  CollectionPermission,
  DocumentPermission,
  NavigationNode,
} from "@shared/types";
import { client } from "~/utils/ApiClient";
import Collection from "./Collection";
import Document from "./Document";
import Group from "./Group";
import Model from "./base/Model";
import { AfterRemove } from "./decorators/Lifecycle";
import Relation from "./decorators/Relation";

/**
 * Represents a groups's membership to a collection or document.
 */
class GroupMembership extends Model {
  static modelName = "GroupMembership";

  private isFetching = false;

  /** The group ID that this membership is granted to. */
  groupId: string;

  /** The group that this membership is granted to. */
  @Relation(() => Group, { onDelete: "cascade" })
  group: Group;

  /** The document ID that this membership grants the group access to. */
  documentId: string | undefined;

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

  /** The sub-documents structure, in case this membership provides access to a document. */
  @observable
  documents?: NavigationNode[];

  /**
   * Fetches the sub-documents structure, in case this membership provides access to a document.
   */
  fetchDocuments = async (options?: { force: boolean }) => {
    if (!this.documentId || this.isFetching) {
      return;
    }
    if (this.documents && options?.force !== true) {
      return;
    }
    try {
      this.isFetching = true;
      const res = await client.post("/documents.child_documents", {
        id: this.documentId,
      });
      invariant(res?.data, "Data should be available");

      runInAction("GroupMembership#fetchSubDocuments", () => {
        this.documents = res.data;
      });
    } finally {
      this.isFetching = false;
    }
  };

  /**
   * Updates the document identified by the given id in the membership in memory.
   * Does not update the document in the database.
   *
   * @param document The document properties stored in the membership
   */
  @action
  updateDocument(
    document: Pick<Document, "id" | "title" | "url" | "color" | "icon">
  ) {
    if (!this.documents) {
      return;
    }

    const travelNodes = (nodes: NavigationNode[]) =>
      nodes.forEach((node) => {
        if (node.id === document.id) {
          node.color = document.color ?? undefined;
          node.icon = document.icon ?? undefined;
          node.title = document.title;
          node.url = document.url;
        } else {
          travelNodes(node.children);
        }
      });

    travelNodes(this.documents);
  }

  /**
   * Removes the document identified by the given id in the membership in memory.
   * Does not remove the document from the database.
   *
   * @param documentId The id of the document to remove.
   */
  @action
  removeDocument(documentId: string) {
    if (!this.documents) {
      return;
    }

    this.documents = this.documents.filter(function f(node): boolean {
      if (node.id === documentId) {
        return false;
      }

      if (node.children) {
        node.children = node.children.filter(f);
      }

      return true;
    });
  }

  // hooks

  @AfterRemove
  public static removeFromPolicies(model: GroupMembership) {
    model.store.rootStore.policies.removeForMembership(model.id);
  }
}

export default GroupMembership;
