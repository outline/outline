import { pick } from "es-toolkit";
import {
  ProsemirrorHelper,
  type CommentMark,
} from "@shared/utils/ProsemirrorHelper";
import type { ProsemirrorData } from "@shared/types";
import type { Comment } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import presentUser from "./user";

type Options = {
  /** Whether to include anchor text, if it exists */
  includeAnchorText?: boolean;
  /** Precomputed comment marks to avoid reparsing the document. */
  commentMarks?: CommentMark[];
  /** Whether to omit private account details from the author. */
  isPublic?: boolean;
};

/**
 * Presents a comment, limiting account details for public visitors.
 *
 * @param comment the comment to present.
 * @param options the anchor and visibility options.
 * @returns the serialized comment.
 */
export default function present(
  comment: Comment,
  { includeAnchorText, commentMarks, isPublic }: Options = {}
) {
  let anchorText: string | undefined;

  if (includeAnchorText && comment.document) {
    const marks =
      commentMarks ??
      ProsemirrorHelper.getComments(
        DocumentHelper.toProsemirror(comment.document)
      );
    anchorText = ProsemirrorHelper.getAnchorTextForComment(marks, comment.id);
  }

  const isGuest = !comment.createdById;
  const data = isPublic ? sanitizePublicData(comment.data) : comment.data;

  // Guest comments have no account behind them. A team member's account is
  // shown to public visitors only as the minimal identity needed to render
  // the author – never the full account presentation.
  const createdBy = !comment.createdBy
    ? null
    : isPublic
      ? pick(presentUser(comment.createdBy), [
          "id",
          "name",
          "avatarUrl",
          "color",
        ])
      : presentUser(comment.createdBy);

  return {
    id: comment.id,
    data,
    documentId: comment.documentId,
    parentCommentId: comment.parentCommentId,
    createdBy,
    createdById: comment.createdById,
    guestName: isGuest ? (comment.guestName ?? null) : undefined,
    isPublic: comment.isPublic,
    isGuest,
    resolvedAt: comment.resolvedAt,
    resolvedBy:
      !isPublic && comment.resolvedBy ? presentUser(comment.resolvedBy) : null,
    resolvedById: isPublic ? null : comment.resolvedById,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    reactions: isPublic ? [] : (comment.reactions ?? []),
    anchorText,
  };
}

function sanitizePublicData(node: ProsemirrorData): ProsemirrorData {
  if (node.type === "mention") {
    return {
      type: "text",
      text: String(node.attrs?.label ?? "mention"),
    };
  }

  return {
    ...node,
    content: node.content?.map(sanitizePublicData),
  };
}
