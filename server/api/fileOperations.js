// @flow
import Router from "koa-router";
import { NotFoundError } from "../errors";
import auth from "../middlewares/authentication";
import { FileOperation, User, Collection, Team } from "../models";
import policy from "../policies";
import { presentFileOperation } from "../presenters";
import { getSignedUrl } from "../utils/s3";
import pagination from "./middlewares/pagination";

const { authorize } = policy;
const router = new Router();

router.post("fileOperations.list", auth(), pagination(), async (ctx) => {
  let { sort = "createdAt", direction, type } = ctx.body;

  ctx.assertPresent(type, "type is required");

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
      include: [
        {
          model: User,
          as: "user",
          paranoid: false,
        },
        {
          model: Collection,
          as: "collection",
          paranoid: false,
        },
      ],
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
  ctx.assertPresent(id, "id is required");

  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);

  const fileOp = await FileOperation.findByPk(id);
  if (!fileOp) {
    throw new NotFoundError();
  }

  authorize(user, fileOp.type, team);

  const accessUrl = await getSignedUrl(fileOp.key);

  ctx.redirect(accessUrl);
});

export default router;
