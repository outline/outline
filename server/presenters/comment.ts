import { Comment } from "@server/models";
import presentUser from "./user";

export default function present(comment: Comment) {
  return {
    id: comment.id,
    data: comment.data,
    documentId: comment.documentId,
    parentCommentId: comment.parentCommentId,
    createdBy: presentUser(comment.createdBy),
    createdById: comment.createdById,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}
