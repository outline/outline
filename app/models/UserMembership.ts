import { observable } from "mobx";
import type { NotePermission } from "@shared/types";
import type UserMembershipsStore from "~/stores/UserMembershipsStore";
import Note from "./Note";
import User from "./User";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";
import NavigableModel from "./base/NavigableModel";
class UserMembership extends NavigableModel {
  static modelName = "UserMembership";
  /** The sort order of the membership (In users sidebar) */
  @Field
  @observable
  index: string;
  /** The permission level granted to the user. */
  @observable
  permission: NotePermission;
  /** The note that this membership grants the user access to. */
  @Relation(() => Note, { onDelete: "cascade" })
  note?: Note;
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
  store: UserMembershipsStore;
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
}
export default UserMembership;
