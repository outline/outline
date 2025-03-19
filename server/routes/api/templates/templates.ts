import Router from "koa-router";
import { Op, WhereOptions } from "sequelize";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
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
    } else {
      where[Op.and].push({
        [Op.or]: [
          {
            collectionId: {
              [Op.eq]: null,
            },
          },
          {
            collectionId: await user.collectionIds(),
          },
        ],
      });
    }

    const [templates, total] = await Promise.all([
      Template.scope([
        "defaultScope",
        {
          method: ["withCollectionPermissions", user.id],
        },
      ]).findAll({
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

router.post(
  "templates.info",
  auth(),
  validate(T.TemplatesInfoSchema),
  async (ctx: APIContext<T.TemplatesInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const template = await Template.findByPk(id, {
      userId: user.id,
      rejectOnEmpty: true,
    });
    authorize(user, "read", template);

    const data = await presentTemplate(ctx, template);
    const policies = presentPolicies(user, [template]);

    ctx.body = {
      data,
      policies,
    };
  }
);

router.post(
  "templates.delete",
  auth(),
  validate(T.TemplatesDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.TemplatesDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const template = await Template.findByPk(id, {
      userId: user.id,
      rejectOnEmpty: true,
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    authorize(user, "delete", template);

    await template.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "templates.duplicate",
  auth(),
  validate(T.TemplatesDuplicateSchema),
  transaction(),
  async (ctx: APIContext<T.TemplatesDuplicateReq>) => {
    const { transaction } = ctx.state;
    const { id, title, publish } = ctx.input.body;
    const { user } = ctx.state.auth;

    const original = await Template.findByPk(id, {
      userId: user.id,
      rejectOnEmpty: true,
      transaction,
    });
    authorize(user, "duplicate", original);

    const template = await Template.createWithCtx(ctx, {
      title: title ?? original.title,
      publishedAt: publish ? new Date() : null,
      createdById: user.id,
      lastModifiedById: user.id,
      teamId: user.teamId,
      collectionId: original.collectionId,
      content: original.content,
      icon: original.icon,
      color: original.color,
      fullWidth: original.fullWidth,
    });

    ctx.body = {
      data: presentTemplate(ctx, template),
      policies: presentPolicies(user, [template]),
    };
  }
);

router.post(
  "templates.update",
  auth(),
  validate(T.TemplatesUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.TemplatesUpdateReq>) => {
    const { transaction } = ctx.state;
    const { id, data, ...updatedFields } = ctx.input.body;
    const { user } = ctx.state.auth;

    const template = await Template.findByPk(id, {
      userId: user.id,
      rejectOnEmpty: true,
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    authorize(user, "update", template);

    if (data) {
      template.content = data;
    }

    await template.updateWithCtx(ctx, updatedFields);

    ctx.body = {
      data: await presentTemplate(ctx, template),
      policies: presentPolicies(user, [template]),
    };
  }
);

export default router;
