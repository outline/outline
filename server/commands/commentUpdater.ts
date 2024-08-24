import { Transaction } from "sequelize";
import { ProsemirrorData } from "@shared/types";
import { Event, Comment, User } from "@server/models";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";

type Props = {
  /** The user updating the comment */
  user: User;
  /** The user resolving the comment */
  resolvedBy?: User;
  /** The existing comment */
  comment: Comment;
  /** The comment data */
  data: ProsemirrorData;
  /** The IP address of the user creating the comment */
  ip: string;
  transaction: Transaction;
};

/**
 * This command updates a comment.
 *
 * @param Props The properties of the comment to update
 * @returns Comment The updated comment
 */
export default async function commentUpdater({
  user,
  comment,
  data,
  resolvedBy,
  ip,
  transaction,
}: Props): Promise<Comment> {
  const mentionIdsBefore = ProsemirrorHelper.parseMentions(
    ProsemirrorHelper.toProsemirror(comment.data)
  ).map((mention) => mention.id);

  if (resolvedBy !== undefined) {
    comment.resolvedBy = resolvedBy;
  }
  if (data !== undefined) {
    comment.data = data;
  }

  const mentionsAfter = ProsemirrorHelper.parseMentions(
    ProsemirrorHelper.toProsemirror(comment.data)
  );

  const newMentionIds = mentionsAfter
    .filter((mention) => !mentionIdsBefore.includes(mention.id))
    .map((mention) => mention.id);

  await comment.save({ transaction });

  await Event.create(
    {
      name: "comments.update",
      modelId: comment.id,
      teamId: user.teamId,
      actorId: user.id,
      documentId: comment.documentId,
      ip,
      data: {
        newMentionIds,
      },
    },
    { transaction }
  );

  return comment;
}
