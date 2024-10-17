import { subSeconds } from "date-fns";
import uniq from "lodash/uniq";
import { action, computed, observable } from "mobx";
import { now } from "mobx-utils";
import type { ProsemirrorData, Reaction } from "@shared/types";
import User from "~/models/User";
import { client } from "~/utils/ApiClient";
import Document from "./Document";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

class Comment extends Model {
  static modelName = "Comment";

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
  parentCommentId: string | null;

  /**
   * The comment that this comment is a reply to.
   */
  @Relation(() => Comment, { onDelete: "cascade" })
  parentComment?: Comment;

  /**
   * The document ID to which this comment belongs.
   */
  @Field
  @observable
  documentId: string;

  /**
   * The document that this comment belongs to.
   */
  @Relation(() => Document, { onDelete: "cascade" })
  document: Document;

  /**
   * The user who created this comment.
   */
  @Relation(() => User)
  createdBy: User;

  /**
   * The ID of the user who created this comment.
   */
  createdById: string;

  /**
   * The date and time that this comment was resolved, if it has been resolved.
   */
  @observable
  resolvedAt: string;

  /**
   * The user who resolved this comment, if it has been resolved.
   */
  @Relation(() => User)
  resolvedBy: User | null;

  /**
   * The ID of the user who resolved this comment, if it has been resolved.
   */
  resolvedById: string | null;

  @observable
  reactions: Reaction[];

  /**
   * An array of users that are currently typing a reply in this comments thread.
   */
  @computed
  public get currentlyTypingUsers(): User[] {
    return Array.from(this.typingUsers.entries())
      .filter(([, lastReceivedDate]) => lastReceivedDate > subSeconds(now(), 3))
      .map(([userId]) => this.store.rootStore.users.get(userId))
      .filter(Boolean) as User[];
  }

  /**
   * Whether the comment is resolved
   */
  @computed
  public get isResolved() {
    return !!this.resolvedAt;
  }

  /**
   * Whether the comment is a reply to another comment.
   */
  @computed
  public get isReply() {
    return !!this.parentCommentId;
  }

  /**
   * Resolve the comment
   */
  public resolve() {
    return this.store.rootStore.comments.resolve(this.id);
  }

  /**
   * Unresolve the comment
   */
  public unresolve() {
    return this.store.rootStore.comments.unresolve(this.id);
  }

  @action
  public addReaction = async ({
    emoji,
    userId,
  }: {
    emoji: string;
    userId: string;
  }) => {
    this.updateReaction({ type: "add", emoji, userId });
    try {
      await client.post("/comments.add_reaction", {
        id: this.id,
        emoji,
      });
    } catch {
      this.updateReaction({ type: "remove", emoji, userId });
    }
  };

  @action
  public removeReaction = async ({
    emoji,
    userId,
  }: {
    emoji: string;
    userId: string;
  }) => {
    this.updateReaction({ type: "remove", emoji, userId });
    try {
      await client.post("/comments.remove_reaction", {
        id: this.id,
        emoji,
      });
    } catch {
      this.updateReaction({ type: "add", emoji, userId });
    }
  };

  @action
  public updateReaction = ({
    type,
    emoji,
    userId,
  }: {
    type: "add" | "remove";
    emoji: string;
    userId: string;
  }) => {
    const reaction = this.reactions.find((r) => r.emoji === emoji);

    if (type === "add") {
      if (!reaction) {
        this.reactions.push({ emoji, userIds: [userId] });
      } else {
        reaction.userIds = uniq([...reaction.userIds, userId]);
      }
    } else {
      if (reaction) {
        reaction.userIds = reaction.userIds.filter((id) => id !== userId);
      }

      if (reaction?.userIds.length === 0) {
        this.reactions = this.reactions.filter(
          (r) => r.emoji !== reaction.emoji
        );
      }
    }
  };

  fetchReactions = async () => {
    const res = await client.post("/reactions.list", {
      commentId: this.id,
    });
    return res.data;
  };
}

export default Comment;
