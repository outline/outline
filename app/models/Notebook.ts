import { action, comparer, computed, observable, runInAction } from "mobx";
import {
  type NotebookPermission,
  type FileOperationFormat,
  type NavigationNode,
  NavigationNodeType,
  type ProsemirrorData,
} from "@shared/types";
import { sortNavigationNodes } from "@shared/utils/notebooks";
import type NotebooksStore from "~/stores/NotebooksStore";
import type Note from "~/models/Note";
import ParanoidModel from "~/models/base/ParanoidModel";
import { petsoClient } from "~/utils/petsoClient";
import { exportPetStoreNotes } from "~/utils/exportPetStoreNotes";
import type User from "./User";
import Field from "./decorators/Field";
import { AfterChange } from "./decorators/Lifecycle";
export default class Notebook extends ParanoidModel {
  static modelName = "Collection";
  store: NotebooksStore;
  /** The name of the notebook. */
  @Field
  @observable
  name: string;
  /** Notebook description in Prosemirror format. */
  @Field
  @observable.shallow
  data: ProsemirrorData;
  /** An icon (or) emoji to use as the notebook icon. */
  @Field
  @observable
  icon: string;
  /** The color to use for the notebook icon and other highlights. */
  @Field
  @observable
  color?: string | null;
  /** The default permission for workspace users. */
  @Field
  @observable
  permission?: NotebookPermission;
  /**
   * Whether public sharing is enabled for the notebook. Note this can also be disabled at the
   * workspace level.
   */
  @Field
  @observable
  sharing: boolean;
  /** The sort index for the notebook. */
  @Field
  @observable
  index: string;
  /** The sort field and direction for notes in the notebook. */
  @Field
  @observable
  sort: {
    field: string;
    direction: "asc" | "desc";
  };
  /** The minimum permission level required to manage templates in this notebook. */
  @Field
  @observable
  templateManagement: NotebookPermission;
  /**
   * Whether commenting is enabled for the notebook.
   */
  @Field
  @observable
  commenting?: boolean | null;
  /** The child notes of the notebook. */
  @observable
  notes?: NavigationNode[];
  /** @deprecated Use path instead. */
  @observable
  url: string;
  /** The ID that appears in the notebook slug. */
  @observable
  urlId: string;
  /**
   * The date and time the notebook was archived.
   */
  @observable
  archivedAt: string;
  /**
   * User who archived the notebook.
   */
  @observable
  archivedBy?: User;
  @computed
  get searchContent(): string {
    return this.name;
  }
  /** Returns whether the notebook is empty, or undefined if not loaded. */
  @computed
  get isEmpty(): boolean | undefined {
    if (!this.notes) {
      return undefined;
    }
    return (
      this.notes.length === 0 &&
      this.store.rootStore.notes.inNotebook(this.id).length === 0
    );
  }
  /**
   * Convenience method to return if a notebook is considered private.
   * This means that a membership is required to view it rather than just being
   * a workspace member.
   *
   * @returns boolean
   */
  get isPrivate(): boolean {
    return this.permission === null;
  }
  @computed
  get isStarred(): boolean {
    return !!this.store.rootStore.stars.orderedData.find(
      (star) => star.notebookId === this.id
    );
  }
  /**
   * Returns whether there is a subscription for this notebook in the store.
   *
   * @returns True if there is a subscription, false otherwise.
   */
  @computed
  get isSubscribed(): boolean {
    return !!this.store.rootStore.subscriptions.getByNotebookId(this.id);
  }
  @computed
  get isManualSort(): boolean {
    return this.sort.field === "index";
  }
  @computed({ equals: comparer.structural })
  get sortedNotes(): NavigationNode[] | undefined {
    if (!this.notes) {
      return undefined;
    }
    return sortNavigationNodes(this.notes, this.sort);
  }
  /**
   * Returns a lookup from note id to child notes.
   *
   * @returns a map of note id to child note nodes.
   */
  @computed({ keepAlive: true })
  get childrenByNoteId(): Map<string, NavigationNode[]> {
    const childrenByNoteId = new Map<string, NavigationNode[]>();
    const travelNodes = (nodes: NavigationNode[]) => {
      for (const node of nodes) {
        childrenByNoteId.set(node.id, node.children);
        travelNodes(node.children);
      }
    };
    if (this.sortedNotes) {
      travelNodes(this.sortedNotes);
    }
    return childrenByNoteId;
  }
  /** The initial letter of the notebook name as a string. */
  @computed
  get initial() {
    return (this.name?.charAt(0) ?? "?").toUpperCase();
  }
  @computed
  get path() {
    return this.url.replace(/^\/collections?\//, "/notebook/");
  }
  /**
   * Returns users that have been individually given access to the notebook.
   *
   * @returns A list of users that have been given access to the notebook.
   */
  @computed
  get members(): User[] {
    return this.store.rootStore.memberships.orderedData
      .filter((m) => m.notebookId === this.id)
      .map((m) => m.user)
      .filter(Boolean);
  }
  @computed
  get isArchived() {
    return !!this.archivedAt;
  }
  @computed
  get isDeleted() {
    return !!this.deletedAt;
  }
  @computed
  get isActive() {
    return !this.isArchived && !this.isDeleted;
  }
  @computed
  get hasNotes() {
    return !!this.notes?.length;
  }
  fetchNotes = async (options?: { force: boolean }) => {
    if (this.isFetching) {
      return;
    }
    if (this.notes && options?.force !== true) {
      return;
    }
    try {
      this.isFetching = true;
      const notes = await petsoClient.admin.notes();
      runInAction("Notebook#fetchNotes", () => {
        this.notes = notes
          .filter((note) => note.collectionId === this.id)
          .map((note) => ({
            type: NavigationNodeType.Note,
            id: note.id,
            title: note.title,
            url: `/doc/${note.id}`,
            children: [],
            isDraft: !note.isPublished,
          }));
      });
    } finally {
      this.isFetching = false;
    }
  };
  /**
   * Updates the note identified by the given id in the notebook in memory.
   * Does not update the note in the database.
   *
   * @param note The note properties stored in the notebook
   */
  @action
  updateNote(note: Pick<Note, "id" | "title" | "url" | "color" | "icon">) {
    if (!this.notes) {
      return;
    }
    const travelNodes = (nodes: NavigationNode[]) =>
      nodes.forEach((node) => {
        if (node.id === note.id) {
          node.color = note.color ?? undefined;
          node.icon = note.icon ?? undefined;
          node.title = note.title;
          node.url = note.url;
        } else {
          travelNodes(node.children);
        }
      });
    travelNodes(this.notes);
  }
  /**
   * Removes the note identified by the given id from the notebook in
   * memory. Does not remove the note from the database.
   *
   * @param noteId The id of the note to remove.
   */
  @action
  removeNote(noteId: string) {
    if (!this.notes) {
      return;
    }
    this.notes = this.notes.filter(function f(node): boolean {
      if (node.id === noteId) {
        return false;
      }
      if (node.children) {
        node.children = node.children.filter(f);
      }
      return true;
    });
  }
  /**
   * Adds the note identified by the given id to the notebook in
   * memory. Does not add the note to the database or store.
   *
   * @param note The note to add.
   * @param parentNoteId The id of the note to add the new note to.
   */
  @action
  addNote(note: Note, parentNoteId?: string) {
    if (!this.notes) {
      return;
    }
    if (!parentNoteId) {
      this.notes.unshift(note.asNavigationNode);
      return;
    }
    const travelNodes = (nodes: NavigationNode[]) =>
      nodes.forEach((node) => {
        if (node.id === parentNoteId) {
          node.children = [note.asNavigationNode, ...(node.children ?? [])];
        } else {
          travelNodes(node.children);
        }
      });
    travelNodes(this.notes);
  }
  @action
  updateIndex(index: string) {
    this.index = index;
  }
  getChildrenForNote(noteId: string) {
    return this.childrenByNoteId.get(noteId) ?? [];
  }
  @computed
  get asNavigationNode(): NavigationNode {
    return {
      type: NavigationNodeType.Notebook,
      id: this.id,
      title: this.name,
      color: this.color ?? undefined,
      icon: this.icon ?? undefined,
      children: this.notes ?? [],
      url: this.url,
    };
  }
  pathToNote(noteId: string) {
    let path: NavigationNode[] | undefined = [];
    const note = this.store.rootStore.notes.get(noteId);
    if (!note) {
      return path;
    }
    const travelNodes = (
      nodes: NavigationNode[],
      previousPath: NavigationNode[]
    ) => {
      nodes.forEach((node) => {
        const newPath = [...previousPath, node];
        if (node.id === noteId) {
          path = newPath;
          return;
        }
        if (note.parentNoteId && node.id === note.parentNoteId) {
          path = [...newPath, note.asNavigationNode];
          return;
        }
        return travelNodes(node.children, newPath);
      });
    };
    if (this.notes) {
      travelNodes(this.notes, path);
    }
    return path;
  }
  @action
  star = async (index?: string) => this.store.star(this, index);
  @action
  unstar = async () => this.store.unstar(this);
  /**
   * Subscribes the current user to this notebook.
   *
   * @returns A promise that resolves when the subscription is created.
   */
  @action
  subscribe = () => this.store.subscribe(this);
  /**
   * Unsubscribes the current user from this notebook.
   *
   * @returns A promise that resolves when the subscription is destroyed.
   */
  @action
  unsubscribe = () => this.store.unsubscribe(this);
  archive = () => this.store.archive(this);
  restore = () => this.store.restore(this);
  /**
   * Duplicates the notebook and the published notes within it.
   *
   * @returns A promise that resolves to the duplicated notebook.
   */
  duplicate = (options?: { name?: string }) =>
    this.store.duplicate(this, options);
  export = (format: FileOperationFormat, _includeAttachments: boolean) =>
    exportPetStoreNotes(this.id, format, this.name);
  // hooks
  @AfterChange
  static removePolicies(
    model: Notebook,
    previousAttributes: Partial<Notebook>
  ) {
    if (
      previousAttributes &&
      (model.sharing !== previousAttributes?.sharing ||
        model.permission !== previousAttributes?.permission)
    ) {
      const { notes, policies } = model.store.rootStore;
      notes.inNotebook(model.id).forEach((note) => {
        policies.remove(note.id);
      });
    }
  }
  private isFetching = false;
}
