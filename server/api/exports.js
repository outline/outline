// @flow
import Router from "koa-router";
import auth from "../middlewares/authentication";
import { Export, User, Collection, Team } from "../models";
import policy from "../policies";
import { presentExport } from "../presenters";
import pagination from "./middlewares/pagination";

const { authorize } = policy;
const router = new Router();

router.post("exports.list", auth(), pagination(), async (ctx) => {
  let { sort = "createdAt", direction } = ctx.body;
  if (direction !== "ASC") direction = "DESC";

  const user = ctx.state.user;

  const where = {
    teamId: user.teamId,
  };

  const team = await Team.findByPk(user.teamId);
  authorize(user, "export", team);

  const [exports, total] = await Promise.all([
    await Export.findAll({
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
    await Export.count({
      where,
    }),
  ]);

  ctx.body = {
    pagination: {
      ...ctx.state.pagination,
      total,
    },
    data: exports.map(presentExport),
  };
});

export default router;
