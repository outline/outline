import Router from "koa-router";
import { Op, WhereOptions } from "sequelize";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Collection, Template } from "@server/models";
import { authorize } from "@server/policies";
import { presentPolicies, presentTemplate } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "templates.list",
  auth(),
  pagination(),
  validate(T.TemplatesListSchema),
  async (ctx: APIContext<T.TemplatesListReq>) => {
    const { sort, direction, collectionId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const where: WhereOptions<Template> & {
      [Op.and]: WhereOptions<Template>[];
    } = {
      teamId: user.teamId,
      [Op.and]: [
        {
          deletedAt: {
            [Op.eq]: null,
          },
        },
      ],
    };

    // if a specific collection is passed then we need to check auth to view it
    if (collectionId) {
      where[Op.and].push({ collectionId: [collectionId] });
      const collection = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(collectionId);
      authorize(user, "read", collection);
    }

    const [templates, total] = await Promise.all([
      Template.findAll({
        where,
        order: [[sort, direction]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Template.count({ where }),
    ]);

    const data = await Promise.all(
      templates.map((template) => presentTemplate(ctx, template))
    );
    const policies = presentPolicies(user, templates);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data,
      policies,
    };
  }
);

export default router;
