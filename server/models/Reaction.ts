import cloneDeep from "lodash/cloneDeep";
import uniq from "lodash/uniq";
import {
  Attributes,
  CreationAttributes,
  FindOrCreateOptions,
  InferAttributes,
  InferCreationAttributes,
  InstanceDestroyOptions,
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
import { createContext } from "@server/context";
import { APIContext } from "@server/types";
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
    ctx: APIContext["context"] &
      FindOrCreateOptions<Attributes<Reaction>, CreationAttributes<Reaction>>
  ) {
    const { transaction } = ctx;

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

    const reactions = cloneDeep(comment.reactions) ?? [];
    const reaction = reactions.find((r) => r.emoji === model.emoji);

    if (!reaction) {
      reactions.push({ emoji: model.emoji, userIds: [model.userId] });
    } else {
      reaction.userIds = uniq([...reaction.userIds, model.userId]);
    }

    comment.reactions = reactions;

    // Pass only the fields needed in APIContext; otherwise sequelize props will be overwritten.
    const context = createContext({
      user: ctx.auth.user,
      authType: ctx.auth.type,
      ...ctx,
    });

    await comment.saveWithCtx(
      context,
      {
        fields: ["reactions"],
        silent: true,
      },
      { name: "add_reaction", data: { emoji: model.emoji } }
    );
  }

  @AfterDestroy
  public static async removeReactionFromCommentCache(
    model: Reaction,
    ctx: APIContext["context"] & InstanceDestroyOptions
  ) {
    const { transaction } = ctx;

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

    let reactions = cloneDeep(comment.reactions) ?? [];
    const reaction = reactions.find((r) => r.emoji === model.emoji);

    if (reaction) {
      reaction.userIds = reaction.userIds.filter((id) => id !== model.userId);

      if (reaction.userIds.length === 0) {
        reactions = reactions.filter((r) => r.emoji !== model.emoji);
      }
    }

    comment.reactions = reactions;

    // Pass only the fields needed in APIContext; otherwise sequelize props will be overwritten.
    const context = createContext({
      user: ctx.auth.user,
      authType: ctx.auth.type,
      ...ctx,
    });

    await comment.saveWithCtx(
      context,
      {
        fields: ["reactions"],
        silent: true,
      },
      { name: "remove_reaction", data: { emoji: model.emoji } }
    );
  }
}

export default Reaction;
