import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { WebhookDelivery } from "@server/models";
import { authorize } from "@server/policies";
import { presentWebhookDelivery } from "@server/presenters";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post(
  "webhookDeliverys.list",
  auth({ admin: true }),
  pagination(),
  async (ctx) => {
    const { user } = ctx.state;
    const { webhookSubscriptionId } = ctx.request.body;
    authorize(user, "listWebhookDeliveries", user.team);

    const deliveries = await WebhookDelivery.findAll({
      where: {
        webhookSubscriptionId,
      },
      order: [["createdAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: deliveries.map(presentWebhookDelivery),
    };
  }
);

export default router;
