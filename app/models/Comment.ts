import invariant from "invariant";
import uniq from "lodash/uniq";
import { action, computed, observable } from "mobx";
import { Pagination } from "@shared/constants";
import type { ProsemirrorData, ReactionSummary } from "@shared/types";
import User from "~/models/User";
import { client } from "~/utils/ApiClient";
import Document from "./Document";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

class Comment extends Model {
  static modelName = "Comment";

  /**
   * The Prosemirror data representing the comment content
   */
  @Field
  @observable.shallow
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

  /**
   * Active reactions for this comment.
   *
   * Note: This contains just the emoji with the associated user-ids.
   */
  @observable
  reactions: ReactionSummary[];

  /**
   * Denotes whether the user data for the active reactions are loaded.
   */
  @observable
  reactedUsersLoaded: boolean = false;

  /**
   * Denotes whether there is an in-flight request for loading reacted users.
   */
  private reactedUsersLoading = false;

  /**
   * Whether the comment is resolved
   */
  @computed
  public get isResolved(): boolean {
    return !!this.resolvedAt || !!this.parentComment?.isResolved;
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

  /**
   * Add an emoji as a reaction to this comment.
   *
   * Optimistically updates the `reactions` cache and invokes the backend API.
   *
   * @param {Object} reaction - The reaction data.
   * @param {string} reaction.emoji - The emoji to add as a reaction.
   * @param {string} reaction.user - The user who added this reaction.
   */
  @action
  public addReaction = async ({
    emoji,
    user,
  }: {
    emoji: string;
    user: User;
  }) => {
    this.updateReaction({ type: "add", emoji, user });
    try {
      await client.post("/comments.add_reaction", {
        id: this.id,
        emoji,
      });
    } catch {
      this.updateReaction({ type: "remove", emoji, user });
    }
  };

  /**
   * Remove an emoji as a reaction from this comment.
   *
   * Optimistically updates the `reactions` cache and invokes the backend API.
   *
   * @param {Object} reaction - The reaction data.
   * @param {string} reaction.emoji - The emoji to remove as a reaction.
   * @param {string} reaction.user - The user who removed this reaction.
   */
  @action
  public removeReaction = async ({
    emoji,
    user,
  }: {
    emoji: string;
    user: User;
  }) => {
    this.updateReaction({ type: "remove", emoji, user });
    try {
      await client.post("/comments.remove_reaction", {
        id: this.id,
        emoji,
      });
    } catch {
      this.updateReaction({ type: "add", emoji, user });
    }
  };

  /**
   * Update the `reactions` cache.
   *
   * @param {Object} reaction - The reaction data.
   * @param {string} reaction.type - The type of the action.
   * @param {string} reaction.emoji - The emoji to update as a reaction.
   * @param {string} reaction.user - The user who performed this action.
   */
  @action
  public updateReaction = ({
    type,
    emoji,
    user,
  }: {
    type: "add" | "remove";
    emoji: string;
    user: User;
  }) => {
    const reaction = this.reactions.find((r) => r.emoji === emoji);

    // Step 1: Update the reactions cache.

    if (type === "add") {
      if (!reaction) {
        this.reactions.push({ emoji, userIds: [user.id] });
      } else {
        reaction.userIds = uniq([...reaction.userIds, user.id]);
      }
    } else {
      if (reaction) {
        reaction.userIds = reaction.userIds.filter((id) => id !== user.id);
      }

      if (reaction?.userIds.length === 0) {
        this.reactions = this.reactions.filter(
          (r) => r.emoji !== reaction.emoji
        );
      }
    }

    // Step 2: Add the user to the store.
    this.store.rootStore.users.add(user);
  };

  /**
   * Load the users for the active reactions.
   *
   *
   * @param {Object} options - Options for loading the data.
   * @param {string} options.limit - Per request limit for pagination.
   */
  @action
  loadReactedUsersData = async (
    { limit }: { limit: number } = { limit: Pagination.defaultLimit }
  ) => {
    if (this.reactedUsersLoading || this.reactedUsersLoaded) {
      return;
    }

    this.reactedUsersLoading = true;

    try {
      const fetchPage = async (offset: number = 0) => {
        const res = await client.post("/reactions.list", {
          commentId: this.id,
          offset,
          limit,
        });

        invariant(res?.data, "Data not available");
        // @ts-expect-error reaction from server response
        res.data.map((reaction) =>
          this.store.rootStore.users.add(reaction.user)
        );

        return res.pagination;
      };

      const { total } = await fetchPage();

      const pages = Math.ceil(total / limit);
      const fetchPages = [];
      for (let page = 1; page < pages; page++) {
        fetchPages.push(fetchPage(page * limit));
      }

      await Promise.all(fetchPages);

      this.reactedUsersLoaded = true;
    } finally {
      this.reactedUsersLoading = false;
    }
  };
}

export default Comment;
