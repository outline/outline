import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { WebhookSubscription } from "@server/models";
import { presentWebhookSubscription } from "@server/presenters";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("webhookSubscriptions.list", auth(), pagination(), async (ctx) => {
  const { user } = ctx.state;
  const webhooks = await WebhookSubscription.findAll({
    where: {
      createdById: user.id,
    },
    order: [["createdAt", "DESC"]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: webhooks.map(presentWebhookSubscription),
  };
});

export default router;
