import invariant from "invariant";
import { concat, find, last, isEmpty } from "lodash";
import { computed, action } from "mobx";
import { CollectionPermission, FileOperationFormat } from "@shared/types";
import parseTitle from "@shared/utils/parseTitle";
import Collection from "~/models/Collection";
import { NavigationNode } from "~/types";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, NotFoundError } from "~/utils/errors";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

enum DocumentPathItemType {
  Collection = "collection",
  Document = "document",
}

export type DocumentPathItem = {
  type: DocumentPathItemType;
  id: string;
  collectionId: string;
  title: string;
  url: string;
};

export type DocumentPath = DocumentPathItem & {
  path: DocumentPathItem[];
};

export default class CollectionsStore extends BaseStore<Collection> {
  constructor(rootStore: RootStore) {
    super(rootStore, Collection);
  }

  @computed
  get active(): Collection | null | undefined {
    return this.rootStore.ui.activeCollectionId
      ? this.data.get(this.rootStore.ui.activeCollectionId)
      : undefined;
  }

  @computed
  get orderedData(): Collection[] {
    let collections = Array.from(this.data.values());
    collections = collections.filter((collection) =>
      collection.deletedAt ? false : true
    );
    return collections.sort((a, b) => {
      if (a.index === b.index) {
        return a.updatedAt > b.updatedAt ? -1 : 1;
      }

      return a.index < b.index ? -1 : 1;
    });
  }

  /**
   * List of paths to each of the documents, where paths are composed of id and title/name pairs
   */
  @computed
  get pathsToDocuments(): DocumentPath[] {
    const results: DocumentPathItem[][] = [];

    const travelDocuments = (
      documentList: NavigationNode[],
      collectionId: string,
      path: DocumentPathItem[]
    ) =>
      documentList.forEach((document: NavigationNode) => {
        const { id, title, url } = document;
        const node = {
          type: DocumentPathItemType.Document,
          id,
          collectionId,
          title,
          url,
        };
        results.push(concat(path, node));
        travelDocuments(document.children, collectionId, concat(path, [node]));
      });

    if (this.isLoaded) {
      this.data.forEach((collection) => {
        const { id, name, url } = collection;
        const node = {
          type: DocumentPathItemType.Collection,
          id,
          collectionId: id,
          title: name,
          url,
        };
        results.push([node]);
        travelDocuments(collection.documents, id, [node]);
      });
    }

    return results.map((result) => {
      const tail = last(result) as DocumentPathItem;
      return { ...tail, path: result };
    });
  }

  @computed
  get tree() {
    const subtree = (node: any) => {
      const isDocument = node.data.type === DocumentPathItemType.Document;
      if (isDocument) {
        const { strippedTitle } = parseTitle(node.data.title);
        node.data.title = strippedTitle;
      }
      const root: any = {
        data: {
          id: node.data.id,
          title: node.data.name || node.data.title,
          type: node.data.type,
          collectionId:
            node.data.type === DocumentPathItemType.Collection
              ? node.data.id
              : node.data.collectionId,
          expanded: isEmpty(node.children) ? undefined : node.data.expanded,
          show: node.data.show,
        },
        children: [],
        parent: node.parent,
        depth: node.depth,
      };
      !isEmpty(node.children) &&
        node.children.forEach((child: any) => {
          root.children.push(
            subtree({
              data: {
                ...child,
                type: DocumentPathItemType.Document,
                collectionId: root.data.collectionId,
                expanded: false,
                show: root.data.expanded ? true : false,
              },
              parent: root,
              children: child.children || [],
              depth: root.depth + 1,
            }).root
          );
        });
      return { root };
    };

    const root: any = {
      data: null,
      parent: null,
      children: [],
      depth: -1,
    };

    if (this.isLoaded) {
      this.data.forEach((collection) => {
        root.children.push(
          subtree({
            data: {
              ...collection,
              type: DocumentPathItemType.Collection,
              expanded: false,
              show: true,
            },
            children: collection.documents || [],
            parent: root,
            depth: root.depth + 1,
          }).root
        );
      });
    }

    return { root };
  }

  @action
  import = async (attachmentId: string, format?: string) => {
    await client.post("/collections.import", {
      type: "outline",
      format,
      attachmentId,
    });
  };

  @action
  move = async (collectionId: string, index: string) => {
    const res = await client.post("/collections.move", {
      id: collectionId,
      index,
    });
    invariant(res?.success, "Collection could not be moved");
    const collection = this.get(collectionId);

    if (collection) {
      collection.updateIndex(res.data.index);
    }
  };

  async update(params: Record<string, any>): Promise<Collection> {
    const result = await super.update(params);

    // If we're changing sharing permissions on the collection then we need to
    // remove all locally cached policies for documents in the collection as they
    // are now invalid
    if (params.sharing !== undefined) {
      const collection = this.get(params.id);

      if (collection) {
        collection.documentIds.forEach((id) => {
          this.rootStore.policies.remove(id);
        });
      }
    }

    return result;
  }

  @action
  async fetch(
    id: string,
    options: Record<string, any> = {}
  ): Promise<Collection> {
    const item = this.get(id) || this.getByUrl(id);
    if (item && !options.force) {
      return item;
    }
    this.isFetching = true;

    try {
      const res = await client.post(`/collections.info`, {
        id,
      });
      invariant(res?.data, "Collection not available");
      this.addPolicies(res.policies);
      return this.add(res.data);
    } catch (err) {
      if (err instanceof AuthorizationError || err instanceof NotFoundError) {
        this.remove(id);
      }

      throw err;
    } finally {
      this.isFetching = false;
    }
  }

  @computed
  get publicCollections() {
    return this.orderedData.filter(
      (collection) =>
        collection.permission &&
        Object.values(CollectionPermission).includes(collection.permission)
    );
  }

  star = async (collection: Collection) => {
    await this.rootStore.stars.create({
      collectionId: collection.id,
    });
  };

  unstar = async (collection: Collection) => {
    const star = this.rootStore.stars.orderedData.find(
      (star) => star.collectionId === collection.id
    );
    await star?.delete();
  };

  getPathForDocument(documentId: string): DocumentPath | undefined {
    return this.pathsToDocuments.find((path) => path.id === documentId);
  }

  titleForDocument(documentUrl: string): string | undefined {
    const path = this.pathsToDocuments.find((path) => path.url === documentUrl);
    if (path) {
      return path.title;
    }

    return;
  }

  getByUrl(url: string): Collection | null | undefined {
    return find(this.orderedData, (col: Collection) => url.endsWith(col.urlId));
  }

  delete = async (collection: Collection) => {
    await super.delete(collection);
    this.rootStore.documents.fetchRecentlyUpdated();
    this.rootStore.documents.fetchRecentlyViewed();
  };

  export = (format: FileOperationFormat) => {
    return client.post("/collections.export_all", {
      format,
    });
  };
}
