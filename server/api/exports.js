// @flow
import Router from "koa-router";
import auth from "../middlewares/authentication";
import { Export, User, Collection } from "../models";
import { presentExport } from "../presenters";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("exports.list", auth(), pagination(), async (ctx) => {
  const user = ctx.state.user;

  const where = {
    teamId: user.teamId,
  };

  const [exports, total] = await Promise.all([
    await Export.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
        },
        {
          model: Collection,
          as: "collection",
        },
      ],
      order: [["createdAt", "DESC"]],
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
