import Router from "koa-router";
import { RateLimiterStrategy } from "@server/RateLimiter";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { View, Document, Event } from "@server/models";
import { authorize } from "@server/policies";
import { presentView } from "@server/presenters";
import { assertUuid } from "@server/validation";

const router = new Router();

router.post("views.list", auth(), async (ctx) => {
  const { documentId, includeSuspended = false } = ctx.body;
  assertUuid(documentId, "documentId is required");

  const { user } = ctx.state;
  const document = await Document.findByPk(documentId, {
    userId: user.id,
    includeMemberships: true,
  });
  authorize(user, "read", document);
  const views = await View.findByDocument(documentId, { includeSuspended });

  ctx.body = {
    data: views.map(presentView),
  };
});

router.post(
  "views.create",
  auth(),
  rateLimiter(RateLimiterStrategy.OneThousandPerHour),
  async (ctx) => {
    const { documentId } = ctx.body;
    assertUuid(documentId, "documentId is required");

    const { user } = ctx.state;
    const document = await Document.findByPk(documentId, {
      userId: user.id,
      includeMemberships: true,
    });
    authorize(user, "read", document);

    const view = await View.incrementOrCreate({
      documentId,
      userId: user.id,
    });

    await Event.create({
      name: "views.create",
      actorId: user.id,
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: user.teamId,
      modelId: view.id,
      data: {
        title: document.title,
      },
      ip: ctx.request.ip,
    });
    view.user = user;

    ctx.body = {
      data: presentView(view),
    };
  }
);

export default router;
