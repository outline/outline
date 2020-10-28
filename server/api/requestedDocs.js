// @flow
import Router from "koa-router";
import auth from "../middlewares/authentication";
import { Event, Follow, RequestedDoc } from "../models";
import policy from "../policies";
import {
  presentPolicies,
  presentRequestedDoc,
} from "../presenters";
import pagination from "./middlewares/pagination";

const { authorize } = policy;
const router = new Router();

router.post("requesteddocs.create", auth(), async (ctx) => {
  const { title, like, collectionId } = ctx.body;
  ctx.assertPresent(title, "title is required");

  const user = ctx.state.user;
  authorize(ctx.state.user, "read", user);

  let requesteddocs = await RequestedDoc.create({
    title,
    like,
    collectionId,
    userId: user.id,
  });

  await Event.create({
    name: "requesteddocs.create",
    requesteddocsId: requesteddocs.id,
    actorId: user.id,
    data: {
      title: requesteddocs.title,
      collectionId: requesteddocs.collectionId,
    },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentRequestedDoc(requesteddocs),
    policies: presentPolicies(user, [requesteddocs]),
  };
});

router.post("requesteddocs.follow", auth(), async (ctx) => {
  const { id } = ctx.body;
  ctx.assertPresent(id, "id is required");

  const user = ctx.state.user;
  const requesteddocs = await RequestedDoc.findByPk(id, { userId: user.id });

  requesteddocs.like = requesteddocs.like + 1;
  await requesteddocs.save();

  await Follow.findOrCreate({
    where: { requestedDocId: requesteddocs.id, userId: user.id },
  });

  ctx.body = {
    success: true,
  };
});

router.post("requesteddocs.unfollow", auth(), async (ctx) => {
  const { id } = ctx.body;
  ctx.assertPresent(id, "id is required");

  const user = ctx.state.user;
  const requesteddocs = await RequestedDoc.findByPk(id, { userId: user.id });

  requesteddocs.like = requesteddocs.like - 1;
  await requesteddocs.save();

  await Follow.destroy({
    where: { requestedDocId: requesteddocs.id, userId: user.id },
  });

  ctx.body = {
    success: true,
  };
});

router.post("requesteddocs.list", auth(), pagination(), async (ctx) => {
  let { direction } = ctx.body;
  if (direction !== "ASC") direction = "DESC";

  const user = ctx.state.user;
  const requesteddocs = await RequestedDoc.findAll();

  ctx.body = {
    pagination: ctx.state.pagination,
    data: requesteddocs,
  };
});

router.post("follows.list", auth(), pagination(), async (ctx) => {
  let { sort = "updatedAt", direction } = ctx.body;
  if (direction !== "ASC") direction = "DESC";

  const user = ctx.state.user;
  const follows = await Follow.findAll();

  ctx.body = {
    pagination: ctx.state.pagination,
    data: follows,
  };
});

export default router;
