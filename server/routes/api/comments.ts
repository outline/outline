import Router from "koa-router";
import { Transaction } from "sequelize";
import commentCreator from "@server/commands/commentCreator";
import commentDestroyer from "@server/commands/commentDestroyer";
import commentUpdater from "@server/commands/commentUpdater";
import { sequelize } from "@server/database/sequelize";
import auth from "@server/middlewares/authentication";
import { Document, Comment } from "@server/models";
import { authorize } from "@server/policies";
import { presentComment, presentPolicies } from "@server/presenters";
import { assertUuid, assertPresent, assertSort } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("comments.create", auth(), async (ctx) => {
  const { id, documentId, parentCommentId, data } = ctx.body;
  assertUuid(documentId, "documentId is required");
  assertPresent(data, "data is required");

  if (id) {
    assertUuid(id, "id must be a uuid");
  }
  if (parentCommentId) {
    assertUuid(parentCommentId, "parentCommentId must be a uuid");
  }

  const { user } = ctx.state;

  const document = await Document.findByPk(documentId, { userId: user.id });
  authorize(user, "read", document);

  const comment = await sequelize.transaction(async (transaction) =>
    commentCreator({
      id,
      data,
      parentCommentId,
      documentId,
      user,
      ip: ctx.request.ip,
      transaction,
    })
  );

  ctx.body = {
    data: presentComment(comment),
    policies: presentPolicies(user, [comment]),
  };
});

router.post("comments.list", auth(), pagination(), async (ctx) => {
  let { direction } = ctx.body;
  const { sort = "createdAt", documentId } = ctx.body;
  assertUuid(documentId, "documentId is required");

  assertSort(sort, Comment);
  if (direction !== "ASC") {
    direction = "DESC";
  }

  const { user } = ctx.state;
  const document = await Document.findByPk(documentId, { userId: user.id });
  authorize(user, "read", document);

  const comments = await Comment.findAll({
    where: { documentId },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: comments.map(presentComment),
    policies: presentPolicies(user, comments),
  };
});

router.post("comments.update", auth(), async (ctx) => {
  const { id, data } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;

  const comment = await sequelize.transaction(async (transaction) => {
    const comment = await Comment.findByPk(id, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    authorize(user, "update", comment);

    return commentUpdater({
      user,
      comment,
      data,
      ip: ctx.request.ip,
      transaction,
    });
  });

  ctx.body = {
    data: presentComment(comment),
    policies: presentPolicies(user, [comment]),
  };
});

router.post("comments.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;

  await sequelize.transaction(async (transaction) => {
    const comment = await Comment.unscoped().findByPk(id, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    authorize(user, "delete", comment);

    return commentDestroyer({
      user,
      comment,
      ip: ctx.request.ip,
      transaction,
    });
  });

  ctx.body = {
    success: true,
  };
});

// router.post("comments.resolve", auth(), async (ctx) => {
// router.post("comments.unresolve", auth(), async (ctx) => {

export default router;
