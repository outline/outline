// @flow
import Router from "koa-router";
import auth from "../middlewares/authentication";
import { Export, Event } from "../models";
import policy from "../policies";
import { presentExport } from "../presenters";
import pagination from "./middlewares/pagination";

const { authorize } = policy;
const router = new Router();

router.post("exports.list", auth(), pagination(), async (ctx) => {
  const user = ctx.state.user;

  const exports = await Export.findAll({
    where: {
      userId: user.id,
    },
    order: [["createdAt", "DESC"]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: exports.map(presentExport),
  };
});

router.post("exports.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  ctx.assertUuid(id, "id is required");

  const user = ctx.state.user;
  const exportData = await Export.findByPk(id);
  authorize(user, "delete", exportData);

  await exportData.destroy();

  await Event.create({
    name: "exports.delete",
    modelId: exportData.id,
    teamId: user.teamId,
    actorId: user.id,
    data: { key: exportData.key, collectionId: exportData.collectionId },
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

export default router;
