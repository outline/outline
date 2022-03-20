import invariant from "invariant";
import { filter } from "lodash";
import { action, runInAction } from "mobx";
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

  threadsInDocument(documentId: string): Comment[] {
    return this.inDocument(documentId).filter(
      (comment) => !comment.parentCommentId
    );
  }

  inThread(parentCommentId: string): Comment[] {
    return filter(
      this.orderedData,
      (comment) =>
        comment.parentCommentId === parentCommentId ||
        (comment.id === parentCommentId && !comment.isNew)
    );
  }

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
}
