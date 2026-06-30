import { Node } from "prosemirror-model";
import type {
  CreateOptions,
  InferAttributes,
  InferCreationAttributes,
  InstanceUpdateOptions,
} from "sequelize";
import {
  DataType,
  BelongsTo,
  BeforeCreate,
  ForeignKey,
  Column,
  Table,
  Length,
  DefaultScope,
  AfterDestroy,
  AfterUpdate,
} from "sequelize-typescript";
import type { ProsemirrorData, ReactionSummary } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { CommentValidation } from "@shared/validations";
import { commentSchema } from "@server/editor";
import { ValidationError } from "@server/errors";
import { CacheHelper } from "@server/utils/CacheHelper";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import Document from "./Document";
import User from "./User";
import { type HookContext } from "./base/Model";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import TextLength from "./validators/TextLength";
import { SkipChangeset } from "./decorators/Changeset";

@DefaultScope(() => ({
  include: [
    {
      model: User,
      as: "createdBy",
      paranoid: false,
    },
    {
      model: User,
      as: "resolvedBy",
      paranoid: false,
    },
  ],
}))
@Table({ tableName: "comments", modelName: "comment" })
@Fix
class Comment extends ParanoidModel<
  InferAttributes<Comment>,
  Partial<InferCreationAttributes<Comment>>
> {
  @TextLength({
    max: CommentValidation.maxLength,
    msg: `Comment must be less than ${CommentValidation.maxLength} characters`,
  })
  @Length({
    max: CommentValidation.maxLength * 10,
    msg: `Comment data is too large`,
  })
  @Column(DataType.JSONB)
  @SkipChangeset
  data: ProsemirrorData;

  @Column(DataType.JSONB)
  reactions: ReactionSummary[] | null;

  // associations

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @Column(DataType.DATE)
  resolvedAt: Date | null;

  @BelongsTo(() => User, "resolvedById")
  resolvedBy: User | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  resolvedById: string | null;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Comment, "parentCommentId")
  parentComment: Comment;

  @ForeignKey(() => Comment)
  @Column(DataType.UUID)
  parentCommentId: string;

  // methods

  /**
   * Resolve the comment. Note this does not save the comment to the database.
   *
   * @param resolvedBy The user who resolved the comment
   */
  public resolve(resolvedBy: User) {
    if (this.isResolved) {
      throw ValidationError("Comment is already resolved");
    }
    if (this.parentCommentId) {
      throw ValidationError("Cannot resolve a reply");
    }

    this.resolvedById = resolvedBy.id;
    this.resolvedBy = resolvedBy;
    this.resolvedAt = new Date();
  }

  /**
   * Unresolve the comment. Note this does not save the comment to the database.
   */
  public unresolve() {
    if (!this.isResolved) {
      throw ValidationError("Comment is not resolved");
    }

    this.resolvedById = null;
    this.resolvedBy = null;
    this.resolvedAt = null;
  }

  /**
   * Whether the comment is resolved
   */
  public get isResolved() {
    return !!this.resolvedAt;
  }

  /**
   * Convert the comment data to plain text
   *
   * @returns The plain text representation of the comment data
   */
  public toPlainText() {
    const node = Node.fromJSON(commentSchema, this.data);
    return ProsemirrorHelper.toPlainText(node);
  }

  // hooks

  // A reply created on an already-resolved thread inherits the parent's
  // resolved state so the resolvedAt column alone can answer "is this thread
  // resolved?" — keeping read queries simple and the counter cache index-only.
  @BeforeCreate
  public static async inheritResolvedFromParent(
    model: Comment,
    options: CreateOptions<InferAttributes<Comment>>
  ) {
    if (!model.parentCommentId || model.resolvedAt) {
      return;
    }
    const parent = await this.unscoped().findOne({
      where: {
        id: model.parentCommentId,
        documentId: model.documentId,
      },
      transaction: options.transaction,
      lock: options.transaction
        ? { level: options.transaction.LOCK.UPDATE, of: this }
        : undefined,
    });
    if (!parent) {
      throw ValidationError("Parent comment must belong to the same document");
    }
    if (parent?.resolvedAt) {
      model.resolvedAt = parent.resolvedAt;
      model.resolvedById = parent.resolvedById;
    }
  }

  // When a thread root is resolved or unresolved, propagate the same state to
  // its replies and invalidate the document's commentCount counter cache.
  @AfterUpdate
  public static async cascadeResolvedToReplies(
    model: Comment,
    options: InstanceUpdateOptions<InferAttributes<Comment>>
  ) {
    if (!model.changed("resolvedAt")) {
      return;
    }

    if (model.parentCommentId === null) {
      await this.update(
        {
          resolvedAt: model.resolvedAt,
          resolvedById: model.resolvedById,
        },
        {
          where: { parentCommentId: model.id, documentId: model.documentId },
          transaction: options.transaction,
          hooks: false,
        }
      );
    }

    const invalidate = () =>
      CacheHelper.removeData(
        RedisPrefixHelper.getCounterCacheKey(
          "Document",
          "unresolvedComments",
          model.documentId
        )
      );

    if (options.transaction) {
      const transaction = options.transaction.parent || options.transaction;
      transaction.afterCommit(invalidate);
    } else {
      await invalidate();
    }
  }

  @AfterDestroy
  public static async deleteChildComments(model: Comment, ctx: HookContext) {
    const { transaction } = ctx;

    const lock = transaction
      ? {
          level: transaction.LOCK.UPDATE,
          of: this,
        }
      : undefined;

    const childComments = await this.findAll({
      where: { parentCommentId: model.id },
      transaction,
      lock,
    });

    await Promise.all(
      childComments.map((childComment) => childComment.destroy({ transaction }))
    );
  }
}

export default Comment;
