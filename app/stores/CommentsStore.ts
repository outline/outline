import invariant from "invariant";
import { compact, differenceBy, keyBy, orderBy, uniq } from "es-toolkit/compat";
import { action, makeObservable, override } from "mobx";
import { computedFn } from "mobx-utils";
import Comment from "~/models/Comment";
import { type CommentSortOption, CommentSortType } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store from "./base/Store";

// Filters are also called outside of reactions, where they run uncached.
const computedFnOptions = { requiresReaction: false };

export default class CommentsStore extends Store<Comment> {
  constructor(rootStore: RootStore) {
    super(rootStore, Comment);
    makeObservable(this);
  }

  /**
   * Returns a list of comments in a document.
   *
   * @param documentId ID of the document to get comments for
   * @returns Array of comments
   */
  inDocument = computedFn(
    (documentId: string): Comment[] =>
      this.filter((comment: Comment) => comment.documentId === documentId),
    computedFnOptions
  );

  /**
   * Returns a list of comments in a document that are not replies to other
   * comments.
   *
   * @param documentId ID of the document to get comments for
   * @param options How to sort the returned threads
   * @returns Array of comments
   */
  threadsInDocument(
    documentId: string,
    options: CommentSortOption = { type: CommentSortType.MostRecent }
  ): Comment[] {
    const comments = this.threadsInDocumentUnsorted(documentId);

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
   * @param options How to sort the returned threads
   * @returns Array of comments
   */
  resolvedThreadsInDocument(
    documentId: string,
    options: CommentSortOption = { type: CommentSortType.MostRecent }
  ): Comment[] {
    return this.threadsInDocument(documentId, options).filter(
      (comment: Comment) => comment.isResolved === true
    );
  }

  /**
   * Returns a list of comments in a document that are not replies to other
   * comments.
   *
   * @param documentId ID of the document to get comments for
   * @param options How to sort the returned threads
   * @returns Array of comments
   */
  unresolvedThreadsInDocument(
    documentId: string,
    options: CommentSortOption = { type: CommentSortType.MostRecent }
  ): Comment[] {
    return this.threadsInDocument(documentId, options).filter(
      (comment: Comment) => comment.isResolved !== true
    );
  }

  /**
   * Returns the total number of unresolved comments in the given document.
   *
   * @param documentId ID of the document to get comments for
   * @returns A number of comments
   */
  unresolvedCommentsInDocumentCount = computedFn(
    (documentId: string): number =>
      this.threadsInDocumentUnsorted(documentId)
        .filter((comment: Comment) => comment.isResolved !== true)
        .reduce((memo, thread) => memo + this.inThread(thread.id).length, 0),
    computedFnOptions
  );

  /**
   * Returns a list of comments that includes the given thread ID and any of it's replies.
   *
   * @param commentId ID of the comment to get replies for
   * @returns Array of comments
   */
  inThread = computedFn(
    (threadId: string): Comment[] =>
      this.filter(
        (comment: Comment) =>
          comment.parentCommentId === threadId || comment.id === threadId
      ),
    computedFnOptions
  );

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

  @override
  get orderedData(): Comment[] {
    return orderBy(Array.from(this.data.values()), "createdAt", "asc");
  }

  private threadsInDocumentUnsorted = computedFn(
    (documentId: string): Comment[] =>
      this.filter(
        (comment: Comment) =>
          comment.documentId === documentId &&
          !comment.parentCommentId &&
          (!comment.isNew ||
            comment.createdById === this.rootStore.auth.currentUserId)
      ),
    computedFnOptions
  );
}
