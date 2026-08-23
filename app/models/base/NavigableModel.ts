import { action, computed, observable, runInAction } from "mobx";
import type { JSONObject, NavigationNode } from "@shared/types";
import { client } from "~/utils/ApiClient";
import Model from "./Model";
import type Note from "../Note";
export default abstract class NavigableModel extends Model {
  private isFetching = false;
  /** The note ID associated with this model. */
  noteId?: string;
  @observable
  node?: NavigationNode;
  /**
   * Fetches the child notes structure from the server.
   */
  async fetchNotes(options: {
    path: string;
    params: JSONObject;
    force?: boolean;
  }) {
    if (this.isFetching) {
      return;
    }
    if (this.notes && options.force !== true) {
      return;
    }
    try {
      this.isFetching = true;
      const res = await client.post(options.path, options.params);
      runInAction(`${NavigableModel.modelName}#fetchNotes`, () => {
        this.node = res.data;
      });
    } finally {
      this.isFetching = false;
    }
  }
  /**
   * Child notes structure of the note shared with this membership.
   */
  @computed
  get notes(): NavigationNode[] | undefined {
    return this.node?.children;
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
    if (this.node) {
      travelNodes([this.node]);
    }
    return childrenByNoteId;
  }
  @action
  setNotes(value: NavigationNode[] | undefined) {
    if (this.node && value) {
      this.node.children = value;
    }
  }
  /**
   * Returns the note path from the original note shared with this membership.
   */
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
    if (this.node) {
      travelNodes([this.node], path);
    }
    return path;
  }
  /**
   * Returns the child notes structure for the note.
   */
  getChildrenForNote(noteId: string) {
    return this.childrenByNoteId.get(noteId) ?? [];
  }
  /**
   * Adds the note identified by the given id to the model in
   * memory. Does not add the note to the database or store.
   *
   * @param note The note to add.
   * @param parentNoteId The id of the note to add the new note to.
   */
  @action
  addNote(note: Note, parentNoteId: string) {
    if (!this.notes || !note || !parentNoteId?.trim()) {
      return;
    }
    if (this.noteId && parentNoteId === this.noteId) {
      this.setNotes([note.asNavigationNode, ...(this.notes ?? [])]);
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
  /**
   * Removes the note identified by the given id from the model in
   * memory. Does not remove the note from the database.
   *
   * @param noteId The id of the note to remove.
   */
  @action
  removeNote(noteId: string) {
    if (!this.notes) {
      return;
    }
    this.setNotes(
      this.notes.filter(function f(node): boolean {
        if (node.id === noteId) {
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
