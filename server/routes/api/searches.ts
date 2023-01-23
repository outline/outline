import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { SearchQuery } from "@server/models";
import { presentSearchQuery } from "@server/presenters";
import { APIContext } from "@server/types";
import { assertPresent, assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("searches.list", auth(), pagination(), async (ctx: APIContext) => {
  const { user } = ctx.state.auth;

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

router.post("searches.delete", auth(), async (ctx: APIContext) => {
  const { id, query } = ctx.request.body;
  assertPresent(id || query, "id or query is required");
  if (id) {
    assertUuid(id, "id is must be a uuid");
  }

  const { user } = ctx.state.auth;
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
