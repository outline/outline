import { subSeconds } from "date-fns";
import { computed, observable } from "mobx";
import { now } from "mobx-utils";
import type { ProsemirrorData } from "@shared/types";
import User from "~/models/User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

class Comment extends Model {
  /**
   * Map to keep track of which users are currently typing a reply in this
   * comments thread.
   */
  @observable
  typingUsers: Map<string, Date> = new Map();

  @Field
  @observable
  id: string;

  /**
   * The Prosemirror data representing the comment content
   */
  @Field
  @observable
  data: ProsemirrorData;

  /**
   * If this comment is a reply then the parent comment will be set, otherwise
   * it is a top thread.
   */
  @Field
  @observable
  parentCommentId: string;

  /**
   * The comment that this comment is a reply to.
   */
  @Relation(() => Comment, { onDelete: "cascade" })
  parentComment?: Comment;

  /**
   * The document to which this comment belongs.
   */
  @Field
  @observable
  documentId: string;

  @Relation(() => User)
  createdBy: User;

  createdById: string;

  @observable
  resolvedAt: string;

  @Relation(() => User)
  resolvedBy: User;

  /**
   * An array of users that are currently typing a reply in this comments thread.
   */
  @computed
  get currentlyTypingUsers(): User[] {
    return Array.from(this.typingUsers.entries())
      .filter(([, lastReceivedDate]) => lastReceivedDate > subSeconds(now(), 3))
      .map(([userId]) => this.store.rootStore.users.get(userId))
      .filter(Boolean) as User[];
  }
}

export default Comment;
