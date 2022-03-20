import { subSeconds } from "date-fns";
import { computed, observable } from "mobx";
import { now } from "mobx-utils";
import User from "~/models/User";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class Comment extends BaseModel {
  @observable
  typingUsers: Map<string, Date> = new Map();

  @Field
  @observable
  id: string;

  @Field
  @observable
  data: Record<string, any>;

  @Field
  @observable
  parentCommentId: string;

  @Field
  @observable
  documentId: string;

  createdAt: string;

  createdBy: User;

  resolvedAt: string;

  resolvedBy: User;

  updatedAt: string;

  @computed
  get currentlyTypingUsers(): User[] {
    return Array.from(this.typingUsers.entries())
      .filter(([, lastReceivedDate]) => lastReceivedDate > subSeconds(now(), 3))
      .map(([userId]) => this.store.rootStore.users.get(userId))
      .filter(Boolean);
  }
}

export default Comment;
