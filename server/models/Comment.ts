import { Node } from "prosemirror-model";
import type {
  CreateOptions,
  InferAttributes,
  InferCreationAttributes,
  InstanceUpdateOptions,
  WhereOptions,
} from "sequelize";
import { Op } from "sequelize";
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
import { CommentStatusFilter } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { CommentValidation } from "@shared/validations";
import { commentSchema, serializer } from "@server/editor";
import { ValidationError } from "@server/errors";
import { CacheHelper } from "@server/utils/CacheHelper";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import Document from "./Document";
import User from "./User";
import { type HookContext } from "./base/Model";
import ParanoidModel from "./base/ParanoidModel";
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

  // static methods

  /**
   * Finds the comments a user can access, restricted to a single document or
   * collection when one is given, along with the total for pagination.
   *
   * @param user The user listing comments, whose collection access is applied.
   * @param options Filters, ordering, and pagination for the query.
   * @returns The matching comments and the total number that match.
   */
  static async findAllForUser(
    user: User,
    options: {
      /** Only comments on this document, which the caller has authorized. */
      document?: Document | null;
      /** Only comments in this collection, which the caller has authorized. */
      collectionId?: string;
      /** Only replies to this comment. */
      parentCommentId?: string;
      /** Only comments with these resolution states. */
      statusFilter?: CommentStatusFilter[];
      /** Whether to load and attach the document each comment belongs to. */
      includeDocuments?: boolean;
      sort?: string;
      direction?: "ASC" | "DESC";
      offset?: number;
      limit?: number;
    }
  ): Promise<{ comments: Comment[]; total: number }> {
    const {
      document,
      collectionId,
      parentCommentId,
      statusFilter,
      includeDocuments,
      sort = "createdAt",
      direction = "DESC",
      offset,
      limit,
    } = options;

    const statusQuery: WhereOptions<Comment>[] = [];
    if (statusFilter?.includes(CommentStatusFilter.Resolved)) {
      statusQuery.push({ resolvedById: { [Op.not]: null } });
    }
    if (statusFilter?.includes(CommentStatusFilter.Unresolved)) {
      statusQuery.push({ resolvedById: null });
    }

    const and: WhereOptions<Comment>[] = [];
    if (document) {
      and.push({ documentId: document.id });
    }
    if (parentCommentId) {
      and.push({ parentCommentId });
    }
    if (statusQuery.length) {
      and.push({ [Op.or]: statusQuery });
    }

    // Without a document the join restricts results to documents the user
    // can access. It loads no columns, the document is attached separately.
    const include = document
      ? []
      : [
          {
            model: Document.scope("published"),
            required: true,
            attributes: [],
            where: {
              teamId: user.teamId,
              collectionId: collectionId ?? (await user.collectionIds()),
            },
          },
        ];

    const { rows: comments, count: total } = await this.findAndCountAll({
      where: { [Op.and]: and },
      include,
      order: [[sort, direction]],
      offset,
      limit,
    });

    if (document) {
      comments.forEach((comment) => (comment.document = document));
    } else if (includeDocuments) {
      // Each document is loaded once so comments on the same document share
      // an instance, and with it the memoized comment marks.
      const documents = await Document.scope("withoutState").findAll({
        where: {
          id: [...new Set(comments.map((comment) => comment.documentId))],
        },
      });
      const documentsById = new Map(documents.map((doc) => [doc.id, doc]));
      comments.forEach((comment) => {
        const doc = documentsById.get(comment.documentId);
        if (doc) {
          comment.document = doc;
        }
      });
    }

    return { comments, total };
  }

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

  /**
   * Convert the comment data to markdown.
   *
   * @returns The markdown representation of the comment data
   */
  public toMarkdown() {
    const node = Node.fromJSON(commentSchema, this.data);
    return serializer
      .serialize(node)
      .replace(/(^|\n)\\(\n|$)/g, "\n\n")
      .trim();
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
