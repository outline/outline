import Router from "koa-router";
import { NotFoundError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { Document, Revision } from "@server/models";
import policy from "@server/policies";
import { presentRevision } from "@server/presenters";
import { assertPresent, assertSort } from "@server/validation";
import pagination from "./middlewares/pagination";

const { authorize } = policy;
const router = new Router();

router.post("revisions.info", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertPresent(id, "id is required");
  const user = ctx.state.user;
  const revision = await Revision.findByPk(id);

  if (!revision) {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
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
  let { direction } = ctx.body;
  const { documentId, sort = "updatedAt" } = ctx.body;
  if (direction !== "ASC") direction = "DESC";
  assertSort(sort, Revision);
  assertPresent(documentId, "documentId is required");

  const user = ctx.state.user;
  const document = await Document.findByPk(documentId, {
    userId: user.id,
  });
  authorize(user, "read", document);
  const revisions = await Revision.findAll({
    where: {
      documentId: document.id,
    },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });
  const data = await Promise.all(
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'revision' implicitly has an 'any' type.
    revisions.map((revision) => presentRevision(revision))
  );
  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

export default router;
