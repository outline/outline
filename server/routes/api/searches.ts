import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { SearchQuery } from "@server/models";
import policy from "@server/policies";
import { presentSearchQuery } from "@server/presenters";
import { assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

const { authorize } = policy;
const router = new Router();

router.post("searches.list", auth(), pagination(), async (ctx) => {
  const user = ctx.state.user;
  const keys = await SearchQuery.findAll({
    where: {
      userId: user.id,
    },
    order: [["createdAt", "DESC"]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: keys.map(presentSearchQuery),
  };
});

router.post("searches.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const searchQuery = await SearchQuery.findByPk(id);

  authorize(user, "delete", searchQuery);

  await searchQuery.destroy();

  ctx.body = {
    success: true,
  };
});

export default router;
