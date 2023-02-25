import { Transaction } from "sequelize";
import { Event, Comment, User } from "@server/models";

type Props = {
  /** The user updating the comment */
  user: User;
  /** The user resolving the comment */
  resolvedBy?: User;
  /** The existing comment */
  comment: Comment;
  /** The index to comment the document at */
  data: Record<string, any>;
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
  if (resolvedBy !== undefined) {
    comment.resolvedBy = resolvedBy;
  }
  if (data !== undefined) {
    comment.data = data;
  }

  await comment.save({ transaction });

  await Event.create(
    {
      name: "comments.update",
      modelId: comment.id,
      teamId: user.teamId,
      actorId: user.id,
      documentId: comment.documentId,
      ip,
    },
    { transaction }
  );

  return comment;
}
