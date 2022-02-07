import invariant from "invariant";
import Router from "koa-router";
import { WhereOptions } from "sequelize/types";
import fileOperationDeleter from "@server/commands/fileOperationDeleter";
import { NotFoundError, ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { FileOperation, Team } from "@server/models";
import { authorize } from "@server/policies";
import { presentFileOperation } from "@server/presenters";
import { getSignedUrl } from "@server/utils/s3";
import { assertPresent, assertIn, assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("fileOperations.info", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");
  const { user } = ctx.state;
  const team = await Team.findByPk(user.teamId);
  const fileOperation = await FileOperation.findByPk(id);
  invariant(fileOperation, "File operation not found");

  authorize(user, fileOperation.type, team);

  if (!fileOperation) {
    throw NotFoundError();
  }

  ctx.body = {
    data: presentFileOperation(fileOperation),
  };
});

router.post("fileOperations.list", auth(), pagination(), async (ctx) => {
  let { direction } = ctx.body;
  const { sort = "createdAt", type } = ctx.body;
  assertPresent(type, "type is required");
  assertIn(
    type,
    ["import", "export"],
    "type must be one of 'import' or 'export'"
  );

  if (direction !== "ASC") {
    direction = "DESC";
  }
  const { user } = ctx.state;
  const where: WhereOptions<FileOperation> = {
    teamId: user.teamId,
    type,
  };
  const team = await Team.findByPk(user.teamId);
  authorize(user, type, team);

  const [exports, total] = await Promise.all([
    await FileOperation.findAll({
      where,
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    }),
    await FileOperation.count({
      where,
    }),
  ]);

  ctx.body = {
    pagination: { ...ctx.state.pagination, total },
    data: exports.map(presentFileOperation),
  };
});

router.post("fileOperations.redirect", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const team = await Team.findByPk(user.teamId);
  const fileOp = await FileOperation.unscoped().findByPk(id);

  if (!fileOp) {
    throw NotFoundError();
  }

  authorize(user, fileOp.type, team);

  if (fileOp.state !== "complete") {
    throw ValidationError(`${fileOp.type} is not complete yet`);
  }

  const accessUrl = await getSignedUrl(fileOp.key);
  ctx.redirect(accessUrl);
});

router.post("fileOperations.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const team = await Team.findByPk(user.teamId);
  const fileOp = await FileOperation.findByPk(id);

  if (!fileOp) {
    throw NotFoundError();
  }

  authorize(user, fileOp.type, team);
  await fileOperationDeleter(fileOp, user, ctx.request.ip);

  ctx.body = {
    success: true,
  };
});

export default router;
