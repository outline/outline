import invariant from "invariant";
import { compact, differenceBy, keyBy, orderBy, uniq } from "es-toolkit/compat";
import { action, computed } from "mobx";
import Comment from "~/models/Comment";
import { type CommentSortOption, CommentSortType } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store from "./base/Store";
export default class CommentsStore extends Store<Comment> {
  constructor(rootStore: RootStore) {
    super(rootStore, Comment);
  }
  /**
   * Returns a list of comments in a note.
   *
   * @param documentId ID of the document to get comments for
   * @returns Array of comments
   */
  inNote(noteId: string): Comment[] {
    return this.filter((comment: Comment) => comment.noteId === noteId);
  }
  /**
   * Returns a list of comments in a document that are not replies to other
   * comments.
   *
   * @param documentId ID of the document to get comments for
   * @returns Array of comments
   */
  threadsInNote(
    noteId: string,
    options: CommentSortOption = { type: CommentSortType.MostRecent }
  ) {
    const comments = this.filter(
      (comment: Comment) =>
        comment.noteId === noteId &&
        !comment.parentCommentId &&
        (!comment.isNew ||
          comment.createdById === this.rootStore.auth.currentUserId)
    );
    if (options.type === CommentSortType.MostRecent) {
      return comments;
    }
    const commentsById = keyBy(comments, "id");
    const referencedComments = compact(
      uniq(options.referencedCommentIds.map((id) => commentsById[id]))
    );
    const directComments = differenceBy(comments, referencedComments, "id");
    return [...referencedComments, ...directComments];
  }
  /**
   * Returns a list of resolved comments in a document that are not replies to other
   * comments.
   *
   * @param documentId ID of the document to get comments for
   * @returns Array of comments
   */
  resolvedThreadsInNote(
    noteId: string,
    options: CommentSortOption = { type: CommentSortType.MostRecent }
  ): Comment[] {
    return this.threadsInNote(noteId, options).filter(
      (comment: Comment) => comment.isResolved === true
    );
  }
  /**
   * Returns a list of comments in a document that are not replies to other
   * comments.
   *
   * @param documentId ID of the document to get comments for
   * @returns Array of comments
   */
  unresolvedThreadsInNote(
    noteId: string,
    options: CommentSortOption = { type: CommentSortType.MostRecent }
  ): Comment[] {
    return this.threadsInNote(noteId, options).filter(
      (comment: Comment) => comment.isResolved !== true
    );
  }
  /**
   * Returns the total number of unresolved comments in the given note.
   *
   * @param documentId ID of the document to get comments for
   * @returns A number of comments
   */
  unresolvedCommentsInNoteCount(noteId: string): number {
    return this.unresolvedThreadsInNote(noteId).reduce(
      (memo, thread) => memo + this.inThread(thread.id).length,
      0
    );
  }
  /**
   * Returns a list of comments that includes the given thread ID and any of it's replies.
   *
   * @param commentId ID of the comment to get replies for
   * @returns Array of comments
   */
  inThread(threadId: string): Comment[] {
    return this.filter(
      (comment: Comment) =>
        comment.parentCommentId === threadId || comment.id === threadId
    );
  }
  /**
   * Resolve a comment thread with the given ID.
   *
   * @param id ID of the comment to resolve
   * @returns Resolved comment
   */
  @action
  resolve = async (id: string): Promise<Comment> => {
    const res = await client.post("/comments.resolve", {
      id,
    });
    invariant(res?.data, "Comment not available");
    this.addPolicies(res.policies);
    this.add(res.data);
    return this.data.get(res.data.id) as Comment;
  };
  /**
   * Unresolve a comment thread with the given ID.
   *
   * @param id ID of the comment to unresolve
   * @returns Unresolved comment
   */
  @action
  unresolve = async (id: string): Promise<Comment> => {
    const res = await client.post("/comments.unresolve", {
      id,
    });
    invariant(res?.data, "Comment not available");
    this.addPolicies(res.policies);
    this.add(res.data);
    return this.data.get(res.data.id) as Comment;
  };
  @computed
  get orderedData(): Comment[] {
    return orderBy(Array.from(this.data.values()), "createdAt", "asc");
  }
}
