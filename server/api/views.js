// @flow
import Router from "koa-router";
import auth from "../middlewares/authentication";
import { View, Document, Event } from "../models";
import policy from "../policies";
import { presentView } from "../presenters";

const { authorize } = policy;
const router = new Router();

router.post("views.list", auth(), async (ctx) => {
  const { documentId } = ctx.body;
  ctx.assertUuid(documentId, "documentId is required");

  const user = ctx.state.user;
  const document = await Document.findByPk(documentId, { userId: user.id });
  authorize(user, "read", document);

  const views = await View.findByDocument(documentId);

  ctx.body = {
    data: views.map(presentView),
  };
});

router.post("views.create", auth(), async (ctx) => {
  const { documentId } = ctx.body;
  ctx.assertUuid(documentId, "documentId is required");

  const user = ctx.state.user;
  const document = await Document.findByPk(documentId, { userId: user.id });
  authorize(user, "read", document);

  const view = await View.increment({ documentId, userId: user.id });

  await Event.create({
    name: "views.create",
    actorId: user.id,
    documentId: document.id,
    collectionId: document.collectionId,
    teamId: user.teamId,
    data: { title: document.title },
    ip: ctx.request.ip,
  });

  view.user = user;
  ctx.body = {
    data: presentView(view),
  };
});

export default router;
