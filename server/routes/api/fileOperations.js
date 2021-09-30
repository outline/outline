// @flow
import Router from "koa-router";
import { NotFoundError, ValidationError } from "../../errors";
import Logger from "../../logging/logger";
import auth from "../../middlewares/authentication";
import { FileOperation, Team, Event } from "../../models";
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
    throw new ValidationError("file operation is not complete yet");
  }

  const accessUrl = await getSignedUrl(fileOp.key);

  ctx.redirect(accessUrl);
});

router.post("fileOperations.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  Logger.info("commands", id);
  ctx.assertUuid(id, "id is required");

  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);
  Logger.info("commands", "user and team done");

  authorize(user, "export", team);
  Logger.info("commands", "auth done");

  const fileOp: FileOperation = await FileOperation.findByPk(id);

  if (!fileOp) {
    throw new NotFoundError();
  }

  Logger.info("commands", "fileop found");
  Logger.info("commands", fileOp);
  if (fileOp.state === "expired") {
    throw new ValidationError("file Operation is already expired");
  }

  Logger.info("commands", "expiring");

  await fileOp.expire();

  await Event.create({
    name: "fileOperations.update",
    teamId: team.id,
    actorId: user.id,
    data: fileOp.dataValues,
  });

  console.log("returning success");
  ctx.body = {
    success: true,
  };
});
export default router;
