import Router from "koa-router";
import difference from "lodash/difference";
import { FindOptions, Op, WhereOptions } from "sequelize";
import {
  CommentStatusFilter,
  TeamPreference,
  MentionType,
} from "@shared/types";
import { parser } from "@server/editor";
import auth from "@server/middlewares/authentication";
import { feature } from "@server/middlewares/feature";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, Comment, Collection, Reaction } from "@server/models";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { TextHelper } from "@server/models/helpers/TextHelper";
import { authorize } from "@server/policies";
import { presentComment, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "comments.create",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth(),
  feature(TeamPreference.Commenting),
  validate(T.CommentsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsCreateReq>) => {
    const { id, documentId, parentCommentId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const document = await Document.findByPk(documentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "comment", document);

    const text = ctx.input.body.text
      ? await TextHelper.replaceImagesWithAttachments(
          ctx,
          ctx.input.body.text,
          user
        )
      : undefined;
    const data = text ? parser.parse(text).toJSON() : ctx.input.body.data;

    const comment = await Comment.createWithCtx(ctx, {
      id,
      data,
      createdById: user.id,
      documentId,
      parentCommentId,
    });

    comment.createdBy = user;

    ctx.body = {
      data: presentComment(comment),
      policies: presentPolicies(user, [comment]),
    };
  }
);

router.post(
  "comments.info",
  auth(),
  feature(TeamPreference.Commenting),
  validate(T.CommentsInfoSchema),
  async (ctx: APIContext<T.CommentsInfoReq>) => {
    const { id, includeAnchorText } = ctx.input.body;
    const { user } = ctx.state.auth;

    const comment = await Comment.findByPk(id, {
      rejectOnEmpty: true,
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
    });
    authorize(user, "read", comment);
    authorize(user, "read", document);

    comment.document = document;

    ctx.body = {
      data: presentComment(comment, { includeAnchorText }),
      policies: presentPolicies(user, [comment]),
    };
  }
);

router.post(
  "comments.list",
  auth(),
  pagination(),
  feature(TeamPreference.Commenting),
  validate(T.CommentsListSchema),
  async (ctx: APIContext<T.CommentsListReq>) => {
    const {
      sort,
      direction,
      documentId,
      parentCommentId,
      statusFilter,
      collectionId,
      includeAnchorText,
    } = ctx.input.body;
    const { user } = ctx.state.auth;
    const statusQuery = [];

    if (statusFilter?.includes(CommentStatusFilter.Resolved)) {
      statusQuery.push({ resolvedById: { [Op.not]: null } });
    }
    if (statusFilter?.includes(CommentStatusFilter.Unresolved)) {
      statusQuery.push({ resolvedById: null });
    }

    const where: WhereOptions<Comment> = {
      [Op.and]: [],
    };
    if (documentId) {
      // @ts-expect-error ignore
      where[Op.and].push({ documentId });
    }
    if (parentCommentId) {
      // @ts-expect-error ignore
      where[Op.and].push({ parentCommentId });
    }
    if (statusQuery.length) {
      // @ts-expect-error ignore
      where[Op.and].push({ [Op.or]: statusQuery });
    }

    const params: FindOptions<Comment> = {
      where,
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    };

    let comments, total;
    if (documentId) {
      const document = await Document.findByPk(documentId, { userId: user.id });
      authorize(user, "read", document);
      [comments, total] = await Promise.all([
        Comment.findAll(params),
        Comment.count({ where }),
      ]);
      comments.forEach((comment) => (comment.document = document));
    } else if (collectionId) {
      const collection = await Collection.findByPk(collectionId);
      authorize(user, "read", collection);
      const include = [
        {
          model: Document,
          required: true,
          where: {
            teamId: user.teamId,
            collectionId,
          },
        },
      ];
      [comments, total] = await Promise.all([
        Comment.findAll({
          include,
          ...params,
        }),
        Comment.count({
          include,
          where,
        }),
      ]);
    } else {
      const accessibleCollectionIds = await user.collectionIds();
      const include = [
        {
          model: Document,
          required: true,
          where: {
            teamId: user.teamId,
            collectionId: { [Op.in]: accessibleCollectionIds },
          },
        },
      ];
      [comments, total] = await Promise.all([
        Comment.findAll({
          include,
          ...params,
        }),
        Comment.count({
          include,
          where,
        }),
      ]);
    }

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: comments.map((comment) =>
        presentComment(comment, { includeAnchorText })
      ),
      policies: presentPolicies(user, comments),
    };
  }
);

router.post(
  "comments.update",
  auth(),
  feature(TeamPreference.Commenting),
  validate(T.CommentsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsUpdateReq>) => {
    const { id, data } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "update", comment);
    authorize(user, "comment", document);

    let newMentionIds: string[] = [];

    if (data !== undefined) {
      const existingMentionIds = ProsemirrorHelper.parseMentions(
        ProsemirrorHelper.toProsemirror(comment.data),
        { type: MentionType.User }
      ).map((mention) => mention.id);
      const updatedMentionIds = ProsemirrorHelper.parseMentions(
        ProsemirrorHelper.toProsemirror(data),
        { type: MentionType.User }
      ).map((mention) => mention.id);

      newMentionIds = difference(updatedMentionIds, existingMentionIds);
      comment.data = data;
    }

    await comment.saveWithCtx(ctx, undefined, { data: { newMentionIds } });

    ctx.body = {
      data: presentComment(comment),
      policies: presentPolicies(user, [comment]),
    };
  }
);

router.post(
  "comments.delete",
  auth(),
  feature(TeamPreference.Commenting),
  validate(T.CommentsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
    });
    authorize(user, "delete", comment);
    authorize(user, "comment", document);

    await comment.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "comments.resolve",
  auth(),
  feature(TeamPreference.Commenting),
  validate(T.CommentsResolveSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsResolveReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
    });
    authorize(user, "resolve", comment);
    authorize(user, "update", document);

    comment.resolve(user);
    await comment.saveWithCtx(ctx, { silent: true });

    ctx.body = {
      data: presentComment(comment),
      policies: presentPolicies(user, [comment]),
    };
  }
);

router.post(
  "comments.unresolve",
  auth(),
  feature(TeamPreference.Commenting),
  validate(T.CommentsUnresolveSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsUnresolveReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
    });
    authorize(user, "unresolve", comment);
    authorize(user, "update", document);

    comment.unresolve();
    await comment.saveWithCtx(ctx, { silent: true });

    ctx.body = {
      data: presentComment(comment),
      policies: presentPolicies(user, [comment]),
    };
  }
);

router.post(
  "comments.add_reaction",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  feature(TeamPreference.Commenting),
  validate(T.CommentsReactionSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsReactionReq>) => {
    const { id, emoji } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
      transaction,
    });

    authorize(user, "comment", document);
    authorize(user, "addReaction", comment);

    await Reaction.findOrCreate({
      where: {
        emoji,
        userId: user.id,
        commentId: id,
      },
      ...ctx.context,
    });

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "comments.remove_reaction",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  feature(TeamPreference.Commenting),
  validate(T.CommentsReactionSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsReactionReq>) => {
    const { id, emoji } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
      transaction,
    });

    authorize(user, "comment", document);
    authorize(user, "removeReaction", comment);

    const reaction = await Reaction.findOne({
      where: { emoji, userId: user.id, commentId: id },
      transaction,
    });
    authorize(user, "delete", reaction);

    await reaction.destroy(ctx.context);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
