import { Transaction } from "sequelize";
import { ProsemirrorData } from "@shared/types";
import { Comment, User, Event } from "@server/models";

type Props = {
  id?: string;
  /** The user creating the comment */
  user: User;
  /** The comment as data in Prosemirror schema format */
  data: ProsemirrorData;
  /** The document to comment within */
  documentId: string;
  /** The parent comment we're replying to, if any */
  parentCommentId?: string;
  /** The IP address of the user creating the comment */
  ip: string;
  transaction?: Transaction;
};

/**
 * This command creates a comment inside a document.
 *
 * @param Props The properties of the comment to create
 * @returns Comment The comment that was created
 */
export default async function commentCreator({
  id,
  user,
  data,
  documentId,
  parentCommentId,
  ip,
  transaction,
}: Props): Promise<Comment> {
  // TODO: Parse data to validate

  const comment = await Comment.create(
    {
      id,
      createdById: user.id,
      documentId,
      parentCommentId,
      data,
    },
    { transaction }
  );

  comment.createdBy = user;

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

  return comment;
}
