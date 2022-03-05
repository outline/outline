import { sequelize } from "@server/database/sequelize";
import { Comment, User, Event } from "@server/models";

type Props = {
  /** The user creating the comment */
  user: User;
  /** The comment as data in Prosemirror schema format */
  data: Record<string, any>;
  /** The document to comment within */
  documentId: string;
  /** The parent comment we're replying to, if any */
  parentCommentId?: string;
  /** The IP address of the user creating the comment */
  ip: string;
};

/**
 * This command creates a comment inside a document.
 *
 * @param Props The properties of the comment to create
 * @returns Comment The comment that was created
 */
export default async function commentCreator({
  user,
  data,
  documentId,
  parentCommentId,
  ip,
}: Props): Promise<Comment> {
  const transaction = await sequelize.transaction();
  let comment;

  // TODO: Parse data to validate

  try {
    comment = await Comment.create(
      {
        createdById: user.id,
        documentId,
        parentCommentId,
        data,
      },
      { transaction }
    );

    await Event.create(
      {
        name: "comments.create",
        modelId: comment.id,
        teamId: user.teamId,
        actorId: user.id,
        documentId,
        ip,
      },
      { transaction }
    );
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  return comment;
}
