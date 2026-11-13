import { action, computed, observable, runInAction } from "mobx";
import type { JSONObject, NavigationNode } from "@shared/types";
import { client } from "~/utils/ApiClient";
import { CoalescedFetch } from "./CoalescedFetch";
import Model from "./Model";
import type Document from "../Document";
import type DocumentsStore from "~/stores/DocumentsStore";

export default abstract class NavigableModel extends Model {
  /**
   * Filters memberships to those whose document is not nested under the
   * document of another membership in the list, so that each shared tree is
   * shown once from its highest shared document.
   *
   * @param memberships the memberships to filter.
   * @param documents the documents store used to find parent documents.
   * @returns the memberships that are roots of a shared tree.
   */
  static filterRoots<T extends NavigableModel>(
    memberships: T[],
    documents: DocumentsStore
  ): T[] {
    if (memberships.length < 2) {
      return memberships;
    }

    const rootIds = new Set(memberships.map((m) => m.documentId));

    return memberships.filter((membership) => {
      const { documentId } = membership;
      if (!documentId) {
        return true;
      }

      const visited = new Set([documentId]);
      let document = documents.get(documentId);
      while (document?.parentDocumentId) {
        const { parentDocumentId } = document;
        if (rootIds.has(parentDocumentId)) {
          return false;
        }
        if (visited.has(parentDocumentId)) {
          return true;
        }
        visited.add(parentDocumentId);
        document = documents.get(parentDocumentId);
      }

      // The parent chain is complete, so the loaded trees are not needed.
      if (document) {
        return true;
      }

      // Parent documents may not be loaded, so also check the loaded trees.
      return !memberships.some(
        (other) =>
          other.documentId !== documentId &&
          other.childrenByDocumentId.has(documentId)
      );
    });
  }

  private documentsFetch = new CoalescedFetch();

  /** The document ID associated with this model. */
  documentId?: string;

  @observable
  node?: NavigationNode = undefined;
  /**
   * Fetches the child documents structure from the server.
   */
  async fetchDocuments(options: {
    path: string;
    params: JSONObject;
    force?: boolean;
  }) {
    if (this.documents && options.force !== true) {
      return;
    }

    await this.documentsFetch.run(async () => {
      const res = await client.post(options.path, options.params);

      runInAction(() => {
        this.node = res.data;
      });
    }, options.force);
  }

  /**
   * Child documents structure of the document shared with this membership.
   */
  @computed
  get documents(): NavigationNode[] | undefined {
    return this.node?.children;
  }

  /**
   * Returns a lookup from document id to child documents.
   *
   * @returns a map of document id to child document nodes.
   */
  @computed({ keepAlive: true })
  get childrenByDocumentId(): Map<string, NavigationNode[]> {
    const childrenByDocumentId = new Map<string, NavigationNode[]>();

    const travelNodes = (nodes: NavigationNode[]) => {
      for (const node of nodes) {
        childrenByDocumentId.set(node.id, node.children);
        travelNodes(node.children);
      }
    };

    if (this.node) {
      travelNodes([this.node]);
    }

    return childrenByDocumentId;
  }

  @action
  setDocuments(value: NavigationNode[] | undefined) {
    if (this.node && value) {
      this.node.children = value;
    }
  }

  /**
   * Returns the document path from the original document shared with this membership.
   */
  pathToDocument(documentId: string) {
    let path: NavigationNode[] | undefined = [];
    const document = this.store.rootStore.documents.get(documentId);
    if (!document) {
      return path;
    }

    const travelNodes = (
      nodes: NavigationNode[],
      previousPath: NavigationNode[]
    ) => {
      nodes.forEach((node) => {
        const newPath = [...previousPath, node];

        if (node.id === documentId) {
          path = newPath;
          return;
        }

        if (
          document.parentDocumentId &&
          node.id === document.parentDocumentId
        ) {
          path = [...newPath, document.asNavigationNode];
          return;
        }

        return travelNodes(node.children, newPath);
      });
    };

    if (this.node) {
      travelNodes([this.node], path);
    }

    return path;
  }

  /**
   * Returns the child documents structure for the document.
   */
  getChildrenForDocument(documentId: string) {
    return this.childrenByDocumentId.get(documentId) ?? [];
  }

  /**
   * Adds the document identified by the given id to the model in
   * memory, if it is not already present. Does not add the document to the
   * database or store.
   *
   * @param document The document to add.
   * @param parentDocumentId The id of the document to add the new document to.
   */
  @action
  addDocument(document: Document, parentDocumentId: string) {
    if (!this.documents || this.childrenByDocumentId.has(document.id)) {
      return;
    }

    if (this.documentId && parentDocumentId === this.documentId) {
      this.setDocuments([document.asNavigationNode, ...(this.documents ?? [])]);
    }

    const travelNodes = (nodes: NavigationNode[]) =>
      nodes.forEach((node) => {
        if (node.id === parentDocumentId) {
          node.children = [document.asNavigationNode, ...(node.children ?? [])];
        } else {
          travelNodes(node.children);
        }
      });

    travelNodes(this.documents);
  }

  /**
   * Removes the document identified by the given id from the model in
   * memory. Does not remove the document from the database.
   *
   * @param documentId The id of the document to remove.
   */
  @action
  removeDocument(documentId: string) {
    if (!this.documents) {
      return;
    }

    this.setDocuments(
      this.documents.filter(function f(node): boolean {
        if (node.id === documentId) {
          return false;
        }

        if (node.children) {
          node.children = node.children.filter(f);
        }

        return true;
      })
    );
  }
}
