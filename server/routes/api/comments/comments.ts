import Router from "koa-router";
import { FindOptions, Op, WhereOptions } from "sequelize";
import { CommentStatusFilter, TeamPreference } from "@shared/types";
import commentCreator from "@server/commands/commentCreator";
import commentDestroyer from "@server/commands/commentDestroyer";
import commentUpdater from "@server/commands/commentUpdater";
import auth from "@server/middlewares/authentication";
import { feature } from "@server/middlewares/feature";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, Comment, Collection, Event, Reaction } from "@server/models";
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
    const { id, documentId, parentCommentId, data } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const document = await Document.findByPk(documentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "comment", document);

    const comment = await commentCreator({
      id,
      data,
      parentCommentId,
      documentId,
      user,
      ip: ctx.request.ip,
      transaction,
    });

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
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const comment = await Comment.findByPk(id, {
      rejectOnEmpty: true,
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
    });
    authorize(user, "read", comment);
    authorize(user, "read", document);

    ctx.body = {
      data: presentComment(comment),
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
      data: comments.map(presentComment),
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
    authorize(user, "comment", document);
    authorize(user, "update", comment);

    await commentUpdater({
      user,
      comment,
      data,
      ip: ctx.request.ip,
      transaction,
    });

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
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "comment", document);
    authorize(user, "delete", comment);

    await commentDestroyer({
      user,
      comment,
      ip: ctx.request.ip,
      transaction,
    });

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
    const changes = comment.changeset;
    await comment.save({ transaction });

    await Event.createFromContext(
      ctx,
      {
        name: "comments.update",
        modelId: comment.id,
        documentId: comment.documentId,
        changes,
      },
      { transaction }
    );

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
    const changes = comment.changeset;
    await comment.save({ transaction });

    await Event.createFromContext(
      ctx,
      {
        name: "comments.update",
        modelId: comment.id,
        documentId: comment.documentId,
        changes,
      },
      { transaction }
    );

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
    authorize(user, "addReaction", comment);

    await Reaction.findOrCreate({
      where: {
        emoji,
        userId: user.id,
        commentId: id,
      },
      transaction,
    });
    const added = await comment.updateReactions({
      type: "add",
      emoji,
      userId: user.id,
      transaction,
    });

    if (added) {
      await Event.createFromContext(
        ctx,
        {
          name: "comments.add_reaction",
          modelId: comment.id,
          data: {
            emoji,
          },
        },
        { transaction }
      );
    }

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
    authorize(user, "removeReaction", comment);

    const reaction = await Reaction.findOne({
      where: { emoji, userId: user.id },
      transaction,
    });
    authorize(user, "delete", reaction);

    await reaction.destroy({ transaction });
    const removed = await comment.updateReactions({
      type: "remove",
      emoji: reaction.emoji,
      userId: user.id,
      transaction,
    });

    if (removed) {
      await Event.createFromContext(
        ctx,
        {
          name: "comments.remove_reaction",
          modelId: comment.id,
          data: {
            emoji,
          },
        },
        { transaction }
      );
    }

    ctx.body = {
      success: true,
    };
  }
);

export default router;
