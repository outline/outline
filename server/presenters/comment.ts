import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import type { Comment } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { resolveAnchorToProseMirror } from "@server/utils/anchorResolver";
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
  let resolvedPos;

  if (includeAnchorText && comment.document) {
    const commentMarks = ProsemirrorHelper.getComments(
      DocumentHelper.toProsemirror(comment.document)
    );
    anchorText = ProsemirrorHelper.getAnchorTextForComment(
      commentMarks,
      comment.id
    );
  }

  if (comment.anchor && comment.document && "state" in comment.document) {
    resolvedPos = resolveAnchorToProseMirror(
      comment.anchor,
      comment.document.state
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
    resolvedPosition: resolvedPos,
  };
}
