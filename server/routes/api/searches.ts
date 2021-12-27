import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { SearchQuery } from "@server/models";
import { presentSearchQuery } from "@server/presenters";
import { assertPresent } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("searches.list", auth(), pagination(), async (ctx) => {
  const { user } = ctx.state;

  const searches = await SearchQuery.findAll({
    where: {
      userId: user.id,
    },
    order: [["createdAt", "DESC"]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: searches.map(presentSearchQuery),
  };
});

router.post("searches.delete", auth(), async (ctx) => {
  const { id, query } = ctx.body;
  assertPresent(id || query, "id or query is required");

  const { user } = ctx.state;
  await SearchQuery.destroy({
    where: {
      ...(id ? { id } : { query }),
      userId: user.id,
    },
  });

  ctx.body = {
    success: true,
  };
});

export default router;
