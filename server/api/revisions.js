// @flow
import Router from "koa-router";
import { NotFoundError } from "../errors";
import auth from "../middlewares/authentication";
import { Document, Revision } from "../models";
import policy from "../policies";
import { presentRevision } from "../presenters";
import pagination from "./middlewares/pagination";

const { authorize } = policy;
const router = new Router();

router.post("revisions.info", auth(), async (ctx) => {
  let { id } = ctx.body;
  ctx.assertPresent(id, "id is required");

  const user = ctx.state.user;
  const revision = await Revision.findByPk(id);
  if (!revision) {
    throw new NotFoundError();
  }

  const document = await Document.findByPk(revision.documentId, {
    userId: user.id,
  });
  authorize(user, "read", document);

  ctx.body = {
    pagination: ctx.state.pagination,
    data: await presentRevision(revision),
  };
});

router.post("revisions.list", auth(), pagination(), async (ctx) => {
  let { documentId, sort = "updatedAt", direction } = ctx.body;
  if (direction !== "ASC") direction = "DESC";
  ctx.assertPresent(documentId, "documentId is required");

  const user = ctx.state.user;
  const document = await Document.findByPk(documentId, { userId: user.id });
  authorize(user, "read", document);

  const revisions = await Revision.findAll({
    where: { documentId: document.id },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    revisions.map((revision) => presentRevision(revision))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

export default router;
