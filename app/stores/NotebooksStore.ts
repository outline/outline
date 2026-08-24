import { isEmpty, orderBy, sortBy } from "es-toolkit/compat";
import { computed, action, runInAction } from "mobx";
import {
  NotebookPermission,
  NotebookStatusFilter,
  type FileOperationFormat,
  SubscriptionType,
} from "@shared/types";
import Notebook from "~/models/Notebook";
import type { PaginationParams, Properties } from "~/types";
import { petsoClient } from "~/utils/petsoClient";
import { exportPetStoreNotes } from "~/utils/exportPetStoreNotes";
import type { TNoteCollectionDto } from "@treonstudio/petso-lib";
import type RootStore from "./RootStore";
import Store from "./base/Store";
export default class NotebooksStore extends Store<Notebook> {
  constructor(rootStore: RootStore) {
    super(rootStore, Notebook);
  }
  private mapCollection(collection: TNoteCollectionDto): Notebook {
    return this.add({
      id: collection.id,
      name: collection.name,
      data: { type: "doc", content: [] },
      icon: "📚",
      color: null,
      permission: NotebookPermission.ReadWrite,
      sharing: false,
      index: String(collection.sortOrder).padStart(8, "0"),
      sort: { field: "updatedAt", direction: "desc" },
      templateManagement: NotebookPermission.Admin,
      commenting: false,
      url: `/collections/${collection.id}`,
      urlId: collection.id,
      archivedAt: collection.isArchived ? collection.updatedAt : undefined,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    });
  }
  override async create(params: Properties<Notebook>): Promise<Notebook> {
    const name = params.name?.trim() || "Untitled collection";
    const collection = await petsoClient.admin.createNoteCollection({
      name,
      description: null,
      sortOrder: Number(params.index) || 0,
    });
    return this.mapCollection(collection);
  }
  override async update(params: Properties<Notebook>): Promise<Notebook> {
    if (!params.id) {
      throw new Error("A collection id is required to update a collection");
    }
    const existing = this.get(params.id);
    const name = params.name?.trim() || existing?.name || "Untitled collection";
    const collection = await petsoClient.admin.updateNoteCollection(params.id, {
      name,
      description: null,
      sortOrder: Number(params.index) || 0,
    });
    return this.mapCollection(collection);
  }
  /**
   * Returns the currently active notebook, or undefined if not in the context of a notebook.
   *
   * @returns The active Notebook or undefined
   */
  @computed
  get active(): Notebook | undefined {
    return this.rootStore.ui.activeNotebookId
      ? this.data.get(this.rootStore.ui.activeNotebookId)
      : undefined;
  }
  @computed
  get allActive() {
    return this.orderedData.filter((c) => c.isActive);
  }
  @computed
  get orderedData(): Notebook[] {
    let notebooks = Array.from(this.data.values());
    notebooks = notebooks
      .filter((notebook) => !notebook.deletedAt)
      .filter((notebook) => {
        const can = this.rootStore.policies.abilities(notebook.id);
        return isEmpty(can) || can.readNote;
      });
    return notebooks.sort((a, b) => {
      if (a.index === b.index) {
        return a.updatedAt > b.updatedAt ? -1 : 1;
      }
      return a.index < b.index ? -1 : 1;
    });
  }
  /**
   * Returns all notebooks that require explicit permission to access.
   */
  @computed
  get private(): Notebook[] {
    return this.all.filter((notebook) => notebook.isPrivate);
  }
  /**
   * Returns all notebooks that are accessible by default.
   */
  @computed
  get nonPrivate(): Notebook[] {
    return this.all.filter(
      (notebook) => notebook.isActive && !notebook.isPrivate
    );
  }
  /**
   * Returns all notebooks that are accessible to the current user.
   */
  @computed
  get all(): Notebook[] {
    return sortBy(Array.from(this.data.values()), (notebook) => notebook.name);
  }
  @action
  duplicate = async (
    notebook: Notebook,
    options?: {
      name?: string;
    }
  ): Promise<Notebook> => {
    const duplicated = await petsoClient.admin.createNoteCollection({
      name: options?.name ?? `${notebook.name} copy`,
      description: null,
    });
    return this.mapCollection(duplicated);
  };
  @action
  move = async (notebookId: string, index: string) => {
    const notebook = this.get(notebookId);
    if (notebook) {
      const updated = await petsoClient.admin.updateNoteCollection(notebookId, {
        name: notebook.name,
        description: null,
        sortOrder: Number(index) || 0,
      });
      this.mapCollection(updated);
    }
  };
  @action
  archive = async (notebook: Notebook) => {
    const archived = await petsoClient.admin.archiveNoteCollection(notebook.id);
    runInAction("Notebook#archive", () => {
      this.mapCollection(archived);
    });
  };
  @action
  restore = async (notebook: Notebook) => {
    const restored = await petsoClient.admin.restoreNoteCollection(notebook.id);
    runInAction("Notebook#restore", () => {
      this.mapCollection(restored);
    });
  };
  @action
  fetchNamedPage = async (
    request = "list",
    _options:
      | (PaginationParams & {
          statusFilter: NotebookStatusFilter[];
        })
      | undefined
  ): Promise<Notebook[]> => {
    this.isFetching = true;
    try {
      const collections = await petsoClient.admin.noteCollections();
      const filtered =
        request === "list"
          ? collections
          : collections.filter((collection) => collection.isArchived);
      runInAction("NotebooksStore#fetchNamedPage", () => {
        filtered.forEach((collection) => this.mapCollection(collection));
        this.isLoaded = true;
      });
      return filtered.map((collection) => this.mapCollection(collection));
    } finally {
      this.isFetching = false;
    }
  };
  @action
  fetchArchived = async (options?: PaginationParams): Promise<Notebook[]> =>
    this.fetchNamedPage("list", {
      ...options,
      statusFilter: [NotebookStatusFilter.Archived],
    });
  get(id: string = ""): Notebook | undefined {
    return (
      this.data.get(id) ??
      this.orderedData.find((notebook) => id.endsWith(notebook.urlId))
    );
  }
  @computed
  get archived(): Notebook[] {
    return orderBy(this.orderedData, "archivedAt", "desc").filter(
      (c) => c.isArchived && !c.isDeleted
    );
  }
  @computed
  get publicNotebooks() {
    return this.orderedData.filter(
      (notebook) =>
        notebook.permission &&
        Object.values(NotebookPermission).includes(notebook.permission)
    );
  }
  star = async (notebook: Notebook, index?: string) => {
    await this.rootStore.stars.create({
      notebookId: notebook.id,
      index,
    });
  };
  unstar = async (notebook: Notebook) => {
    const star = this.rootStore.stars.orderedData.find(
      (s) => s.notebookId === notebook.id
    );
    await star?.delete();
  };
  subscribe = (notebook: Notebook) =>
    this.rootStore.subscriptions.create({
      notebookId: notebook.id,
      event: SubscriptionType.Note,
    });
  unsubscribe = (notebook: Notebook) => {
    const subscription = this.rootStore.subscriptions.getByNotebookId(
      notebook.id
    );
    return subscription?.delete();
  };
  @computed
  get navigationNodes() {
    return this.orderedData.map((notebook) => notebook.asNavigationNode);
  }
  async delete(notebook: Notebook) {
    await petsoClient.admin.archiveNoteCollection(notebook.id);
    this.remove(notebook.id);
    await this.rootStore.notes.fetchRecentlyUpdated();
    await this.rootStore.notes.fetchRecentlyViewed();
  }
  export = (options: {
    format: FileOperationFormat;
    includeAttachments: boolean;
    includePrivate: boolean;
  }) => exportPetStoreNotes(undefined, options.format, "pet-store-notes");
}
