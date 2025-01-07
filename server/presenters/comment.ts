import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { Comment } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import presentUser from "./user";

type Options = {
  /** Whether to include anchor text, if it exists */
  includeAnchorText?: boolean;
};

export default function present(
  comment: Comment,
  { includeAnchorText }: Options = {}
) {
  let anchorText: string | undefined;

  if (includeAnchorText && comment.document) {
    const commentMarks = ProsemirrorHelper.getComments(
      DocumentHelper.toProsemirror(comment.document)
    );
    anchorText = ProsemirrorHelper.getAnchorTextForComment(
      commentMarks,
      comment.id
    );
  }

  return {
    id: comment.id,
    data: comment.data,
    documentId: comment.documentId,
    parentCommentId: comment.parentCommentId,
    createdBy: presentUser(comment.createdBy),
    createdById: comment.createdById,
    resolvedAt: comment.resolvedAt,
    resolvedBy: comment.resolvedBy ? presentUser(comment.resolvedBy) : null,
    resolvedById: comment.resolvedById,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    reactions: comment.reactions ?? [],
    anchorText,
  };
}
