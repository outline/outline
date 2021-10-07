// @flow
import Router from "koa-router";
import fileOperationDeleter from "../../commands/fileOperationDeleter";
import { NotFoundError, ValidationError } from "../../errors";
import auth from "../../middlewares/authentication";
import { FileOperation, Team } from "../../models";
import policy from "../../policies";
import { presentFileOperation } from "../../presenters";
import { getSignedUrl } from "../../utils/s3";
import pagination from "./middlewares/pagination";

const { authorize } = policy;
const router = new Router();

router.post("fileOperations.info", auth(), async (ctx) => {
  const { id } = ctx.body;
  ctx.assertUuid(id, "id is required");
  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);

  const fileOperation = await FileOperation.findByPk(id);

  authorize(user, fileOperation.type, team);

  if (!fileOperation) {
    throw new NotFoundError();
  }

  ctx.body = {
    data: presentFileOperation(fileOperation),
  };
});

router.post("fileOperations.list", auth(), pagination(), async (ctx) => {
  let { sort = "createdAt", direction, type } = ctx.body;

  ctx.assertPresent(type, "type is required");
  ctx.assertIn(
    type,
    ["import", "export"],
    "type must be one of 'import' or 'export'"
  );

  if (direction !== "ASC") direction = "DESC";

  const user = ctx.state.user;

  const where = {
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
    pagination: {
      ...ctx.state.pagination,
      total,
    },
    data: exports.map(presentFileOperation),
  };
});

router.post("fileOperations.redirect", auth(), async (ctx) => {
  const { id } = ctx.body;
  ctx.assertUuid(id, "id is required");

  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);
  const fileOp = await FileOperation.unscoped().findByPk(id);

  if (!fileOp) {
    throw new NotFoundError();
  }

  authorize(user, fileOp.type, team);

  if (fileOp.state !== "complete") {
    throw new ValidationError(`${fileOp.type} is not complete yet`);
  }

  const accessUrl = await getSignedUrl(fileOp.key);

  ctx.redirect(accessUrl);
});

router.post("fileOperations.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  ctx.assertUuid(id, "id is required");

  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);
  const fileOp = await FileOperation.findByPk(id);

  if (!fileOp) {
    throw new NotFoundError();
  }

  authorize(user, fileOp.type, team);

  await fileOperationDeleter(fileOp, user, ctx.request.ip);

  ctx.body = {
    success: true,
  };
});
export default router;
