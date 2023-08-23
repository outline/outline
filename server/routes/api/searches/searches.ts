import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { SearchQuery } from "@server/models";
import { presentSearchQuery } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

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

router.post(
  "searches.delete",
  auth(),
  validate(T.SearchesDeleteSchema),
  async (ctx: APIContext<T.SearchesDeleteReq>) => {
    const { id, query } = ctx.input.body;

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
  }
);

export default router;
