import invariant from "invariant";
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
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store from "./base/Store";
export default class NotebooksStore extends Store<Notebook> {
  constructor(rootStore: RootStore) {
    super(rootStore, Notebook);
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
  import = async (
    attachmentId: string,
    options: {
      format?: string;
      permission?: NotebookPermission | null;
    }
  ) => {
    await client.post("/collections.import", {
      attachmentId,
      ...options,
    });
  };
  @action
  duplicate = async (
    notebook: Notebook,
    options?: {
      name?: string;
    }
  ): Promise<Notebook> => {
    const res = await client.post("/collections.duplicate", {
      id: notebook.id,
      ...options,
    });
    invariant(res?.data, "Data should be available");
    this.addPolicies(res.policies);
    return this.add(res.data);
  };
  @action
  move = async (notebookId: string, index: string) => {
    const res = await client.post("/collections.move", {
      id: notebookId,
      index,
    });
    invariant(res?.success, "Notebook could not be moved");
    const notebook = this.get(notebookId);
    if (notebook) {
      notebook.updateIndex(res.data.index);
    }
  };
  @action
  archive = async (notebook: Notebook) => {
    const res = await client.post("/collections.archive", {
      id: notebook.id,
    });
    runInAction("Notebook#archive", () => {
      invariant(res?.data, "Data should be available");
      this.add(res.data);
      this.addPolicies(res.policies);
    });
  };
  @action
  restore = async (notebook: Notebook) => {
    const res = await client.post("/collections.restore", {
      id: notebook.id,
    });
    runInAction("Notebook#restore", () => {
      invariant(res?.data, "Data should be available");
      this.add(res.data);
      this.addPolicies(res.policies);
    });
  };
  async update(params: Properties<Notebook>): Promise<Notebook> {
    const result = await super.update(params);
    // If we're changing sharing permissions on the notebook then we need to
    // remove all locally cached policies for notes in the notebook as they
    // are now invalid
    if (params.sharing !== undefined) {
      this.rootStore.notes.inNotebook(result.id).forEach((note) => {
        this.rootStore.policies.remove(note.id);
      });
    }
    return result;
  }
  @action
  fetchNamedPage = async (
    request = "list",
    options:
      | (PaginationParams & {
          statusFilter: NotebookStatusFilter[];
        })
      | undefined
  ): Promise<Notebook[]> => {
    this.isFetching = true;
    try {
      const res = await client.post(`/collections.${request}`, options);
      invariant(res?.data, "Notebook list not available");
      runInAction("NotebooksStore#fetchNamedPage", () => {
        res.data.forEach(this.add);
        this.addPolicies(res.policies);
        this.isLoaded = true;
      });
      return res.data;
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
    await super.delete(notebook);
    await this.rootStore.notes.fetchRecentlyUpdated();
    await this.rootStore.notes.fetchRecentlyViewed();
  }
  export = (options: {
    format: FileOperationFormat;
    includeAttachments: boolean;
    includePrivate: boolean;
  }) => client.post("/collections.export_all", options);
}
