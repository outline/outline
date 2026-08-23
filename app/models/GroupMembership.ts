import { observable } from "mobx";
import type { NotebookPermission, NotePermission } from "@shared/types";
import Notebook from "./Notebook";
import Note from "./Note";
import Group from "./Group";
import Relation from "./decorators/Relation";
import NavigableModel from "./base/NavigableModel";
import { WireAlias } from "./decorators/Field";
/**
 * Represents a group's membership to a notebook or note.
 */
class GroupMembership extends NavigableModel {
  static modelName = "GroupMembership";
  /** The group ID that this membership is granted to. */
  groupId: string;
  /** The group that this membership is granted to. */
  @Relation(() => Group, { onDelete: "cascade" })
  group: Group;
  /** The note that this membership grants the group access to. */
  @Relation(() => Note, { onDelete: "cascade" })
  note: Note | undefined;
  /** The notebook ID that this membership grants the group access to. */
  @WireAlias("collectionId")
  notebookId: string | undefined;
  /** The notebook that this membership grants the group access to. */
  @Relation(() => Notebook, { onDelete: "cascade" })
  notebook: Notebook | undefined;
  /** The source ID points to the root membership from which this inherits */
  sourceId?: string;
  /** The source points to the root membership from which this inherits */
  @Relation(() => GroupMembership, { onDelete: "cascade" })
  source?: GroupMembership;
  /** The permission level granted to the group. */
  @observable
  permission: NotebookPermission | NotePermission;
  // methods
  /**
   * Fetches the child notes structure from the server.
   */
  async fetchNotes(
    options: {
      force?: boolean;
    } = {}
  ) {
    if (!this.noteId) {
      return;
    }
    await super.fetchNotes({
      path: "/documents.documents",
      params: { id: this.noteId },
      ...options,
    });
  }
}
export default GroupMembership;
