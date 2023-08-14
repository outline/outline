import invariant from "invariant";
import filter from "lodash/filter";
import orderBy from "lodash/orderBy";
import { action, runInAction, computed } from "mobx";
import Comment from "~/models/Comment";
import Document from "~/models/Document";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

export default class CommentsStore extends BaseStore<Comment> {
  apiEndpoint = "comments";

  constructor(rootStore: RootStore) {
    super(rootStore, Comment);
  }

  /**
   * Returns a list of comments in a document that are not replies to other
   * comments.
   *
   * @param documentId ID of the document to get comments for
   * @returns Array of comments
   */
  threadsInDocument(documentId: string): Comment[] {
    return this.inDocument(documentId).filter(
      (comment) => !comment.parentCommentId
    );
  }

  /**
   * Returns a list of comments that are replies to the given comment.
   *
   * @param commentId ID of the comment to get replies for
   * @returns Array of comments
   */
  inThread(threadId: string): Comment[] {
    return filter(
      this.orderedData,
      (comment) =>
        comment.parentCommentId === threadId || comment.id === threadId
    );
  }

  /**
   * Returns a list of comments in a document.
   *
   * @param documentId ID of the document to get comments for
   * @returns Array of comments
   */
  inDocument(documentId: string): Comment[] {
    return filter(
      this.orderedData,
      (comment) => comment.documentId === documentId
    );
  }

  @action
  setTyping({
    commentId,
    userId,
  }: {
    commentId: string;
    userId: string;
  }): void {
    const comment = this.get(commentId);
    if (comment) {
      comment.typingUsers.set(userId, new Date());
    }
  }

  @action
  fetchDocumentComments = async (
    documentId: string,
    options?: PaginationParams | undefined
  ): Promise<Document[]> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/comments.list`, {
        documentId,
        ...options,
      });
      invariant(res && res.data, "Comment list not available");

      runInAction("CommentsStore#fetchDocumentComments", () => {
        res.data.forEach(this.add);
        this.addPolicies(res.policies);
      });
      return res.data;
    } finally {
      this.isFetching = false;
    }
  };

  @computed
  get orderedData(): Comment[] {
    return orderBy(Array.from(this.data.values()), "createdAt", "asc");
  }
}
