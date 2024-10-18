import uniq from "lodash/uniq";
import {
  InferAttributes,
  InferCreationAttributes,
  type SaveOptions,
} from "sequelize";
import {
  AfterCreate,
  AfterDestroy,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import Comment from "./Comment";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

@Table({ tableName: "reactions", modelName: "reaction" })
@Fix
class Reaction extends IdModel<
  InferAttributes<Reaction>,
  Partial<InferCreationAttributes<Reaction>>
> {
  @Length({
    max: 50,
    msg: `emoji must be 50 characters or less`,
  })
  @Column(DataType.STRING)
  emoji: string;

  // associations

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Comment)
  comment: Comment;

  @ForeignKey(() => Comment)
  @Column(DataType.UUID)
  commentId: string;

  @AfterCreate
  public static async addReactionToCommentCache(
    model: Reaction,
    options: SaveOptions<Reaction>
  ) {
    const { transaction } = options;

    const lock = transaction
      ? {
          level: transaction.LOCK.UPDATE,
          of: Comment,
        }
      : undefined;

    const comment = await Comment.findByPk(model.commentId, {
      transaction,
      lock,
    });

    if (!comment) {
      return;
    }

    const reactions = comment.reactions ?? [];
    const reaction = reactions.find((r) => r.emoji === model.emoji);

    if (!reaction) {
      reactions.push({ emoji: model.emoji, userIds: [model.userId] });
    } else {
      reaction.userIds = uniq([...reaction.userIds, model.userId]);
    }

    comment.reactions = reactions;
    comment.changed("reactions", true);
    await comment.save({ fields: ["reactions"], transaction, silent: true });
  }

  @AfterDestroy
  public static async removeReactionFromCommentCache(
    model: Reaction,
    options: SaveOptions<Reaction>
  ) {
    const { transaction } = options;

    const lock = transaction
      ? {
          level: transaction.LOCK.UPDATE,
          of: Comment,
        }
      : undefined;

    const comment = await Comment.findByPk(model.commentId, {
      transaction,
      lock,
    });

    if (!comment) {
      return;
    }

    let reactions = comment.reactions ?? [];
    const reaction = reactions.find((r) => r.emoji === model.emoji);

    if (reaction) {
      reaction.userIds = reaction.userIds.filter((id) => id !== model.userId);

      if (reaction.userIds.length === 0) {
        reactions = reactions.filter((r) => r.emoji !== model.emoji);
      }
    }

    comment.reactions = reactions;
    comment.changed("reactions", true);
    await comment.save({ fields: ["reactions"], transaction, silent: true });
  }
}

export default Reaction;
