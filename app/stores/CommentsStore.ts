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

  inDocument(documentId: string): Comment[] {
    return filter(
      this.orderedData,
      (comment) => comment.documentId === documentId
    );
  }

  @action
  fetchDocumentComments = async (
    documentId: string,
    options: PaginationParams | undefined
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
