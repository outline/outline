import invariant from "invariant";
import { action, observable, runInAction } from "mobx";
import { DocumentPermission, NavigationNode } from "@shared/types";
import type UserMembershipsStore from "~/stores/UserMembershipsStore";
import { client } from "~/utils/ApiClient";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import { AfterRemove } from "./decorators/Lifecycle";
import Relation from "./decorators/Relation";

class UserMembership extends Model {
  static modelName = "UserMembership";

  private isFetching = false;

  /** The sort order of the membership (In users sidebar) */
  @Field
  @observable
  index: string;

  /** The permission level granted to the user. */
  @observable
  permission: DocumentPermission;

  /** The document ID that this membership grants the user access to. */
  documentId?: string;

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

  /** The sub-documents structure, in case this membership provides access to a document. */
  @observable
  documents?: NavigationNode[];

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

  /**
   * Fetches the sub-documents structure, in case this membership provides access to a document.
   */
  fetchDocuments = async (options?: { force: boolean }) => {
    if (this.isFetching || !this.documentId) {
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

      runInAction("UserMembership#fetchSubDocuments", () => {
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
  public static removeFromPolicies(model: UserMembership) {
    model.store.rootStore.policies.removeForMembership(model.id);
  }
}

export default UserMembership;
