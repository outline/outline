import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { SearchQuery } from "@server/models";
import { presentSearchQuery } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "searches.list",
  auth(),
  validate(T.SearchesListSchema),
  pagination(),
  async (ctx: APIContext<T.SearchesListReq>) => {
    const { user } = ctx.state.auth;
    const source = ctx.input.body?.source;

    const searches = await SearchQuery.findAll({
      where: {
        ...(source ? { source } : {}),
        teamId: user.teamId,
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
  }
);

router.post(
  "searches.update",
  auth(),
  validate(T.SearchesUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.SearchesUpdateReq>) => {
    const { id, score } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const search = await SearchQuery.findOne({
      where: {
        id,
        userId: user.id,
      },
      lock: transaction.LOCK.UPDATE,
      rejectOnEmpty: true,
      transaction,
    });

    search.score = score;
    await search.save({ transaction });

    ctx.body = {
      data: presentSearchQuery(search),
    };
  }
);

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
