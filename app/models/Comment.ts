import { subSeconds } from "date-fns";
import { computed, observable } from "mobx";
import { now } from "mobx-utils";
import type { ProsemirrorData } from "@shared/types";
import User from "~/models/User";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class Comment extends BaseModel {
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
   * The document to which this comment belongs.
   */
  @Field
  @observable
  documentId: string;

  createdAt: string;

  createdBy: User;

  createdById: string;

  resolvedAt: string;

  resolvedBy: User;

  updatedAt: string;

  /**
   * An array of users that are currently typing a reply in this comments thread.
   */
  @computed
  get currentlyTypingUsers(): User[] {
    return Array.from(this.typingUsers.entries())
      .filter(([, lastReceivedDate]) => lastReceivedDate > subSeconds(now(), 3))
      .map(([userId]) => this.store.rootStore.users.get(userId))
      .filter(Boolean);
  }
}

export default Comment;
