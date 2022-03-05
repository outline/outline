import Router from "koa-router";
import commentCreator from "@server/commands/commentCreator";
import auth from "@server/middlewares/authentication";
import { Document, Comment } from "@server/models";
import { authorize } from "@server/policies";
import { presentComment } from "@server/presenters";
import { assertUuid, assertPresent, assertSort } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("comments.create", auth(), async (ctx) => {
  const { documentId, parentCommentId, data } = ctx.body;
  assertUuid(documentId, "documentId is required");
  assertPresent(data, "data is required");

  if (parentCommentId) {
    assertUuid(parentCommentId, "parentCommentId must be a uuid");
  }

  const { user } = ctx.state;

  const document = await Document.findByPk(documentId, { userId: user.id });
  authorize(user, "read", document);

  const comment = await commentCreator({
    data,
    parentCommentId,
    documentId,
    user,
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentComment(comment),
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
  };
});

// router.post("comments.info", auth(), async (ctx) => {
// router.post("comments.update", auth(), async (ctx) => {
// router.post("comments.delete", auth(), async (ctx) => {
// router.post("comments.resolve", auth(), async (ctx) => {
// router.post("comments.unresolve", auth(), async (ctx) => {

export default router;
