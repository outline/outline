import { Next } from "koa";
import Router from "koa-router";
import { FindOptions, Op } from "sequelize";
import { TeamPreference } from "@shared/types";
import commentCreator from "@server/commands/commentCreator";
import commentDestroyer from "@server/commands/commentDestroyer";
import commentUpdater from "@server/commands/commentUpdater";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, Comment, Collection } from "@server/models";
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
  checkCommentingEnabled(),
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
  checkCommentingEnabled(),
  validate(T.CommentsInfoSchema),
  async (ctx: APIContext<T.CommentsInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const comment = await Comment.findByPk(id, {
      rejectOnEmpty: true,
    });
    authorize(user, "read", comment);

    if (comment.documentId) {
      const document = await Document.findByPk(comment.documentId, {
        userId: user.id,
      });
      authorize(user, "read", document);
    }

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
  checkCommentingEnabled(),
  validate(T.CommentsListSchema),
  async (ctx: APIContext<T.CommentsListReq>) => {
    const { sort, direction, documentId, collectionId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const params: FindOptions<Comment> = {
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    };

    let comments;
    if (documentId) {
      const document = await Document.findByPk(documentId, { userId: user.id });
      authorize(user, "read", document);
      comments = await Comment.findAll({
        where: {
          documentId: document.id,
        },
        ...params,
      });
    } else if (collectionId) {
      const collection = await Collection.findByPk(collectionId);
      authorize(user, "read", collection);
      comments = await Comment.findAll({
        include: [
          {
            model: Document,
            required: true,
            where: {
              teamId: user.teamId,
              collectionId,
            },
          },
        ],
        ...params,
      });
    } else {
      const accessibleCollectionIds = await user.collectionIds();
      comments = await Comment.findAll({
        include: [
          {
            model: Document,
            required: true,
            where: {
              teamId: user.teamId,
              collectionId: { [Op.in]: accessibleCollectionIds },
            },
          },
        ],
        ...params,
      });
    }

    ctx.body = {
      pagination: ctx.state.pagination,
      data: comments.map(presentComment),
      policies: presentPolicies(user, comments),
    };
  }
);

router.post(
  "comments.update",
  auth(),
  checkCommentingEnabled(),
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
  checkCommentingEnabled(),
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

function checkCommentingEnabled() {
  return async function checkCommentingEnabledMiddleware(
    ctx: APIContext,
    next: Next
  ) {
    if (!ctx.state.auth.user.team.getPreference(TeamPreference.Commenting)) {
      throw ValidationError("Commenting is currently disabled");
    }
    return next();
  };
}

// router.post("comments.resolve", auth(), async (ctx) => {
// router.post("comments.unresolve", auth(), async (ctx) => {

export default router;
