import Router from "koa-router";
import type { WhereOptions } from "sequelize";
import { Op } from "sequelize";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Collection, Template } from "@server/models";
import { authorize } from "@server/policies";
import { presentPolicies, presentTemplate } from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "templates.create",
  auth(),
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  validate(T.TemplatesCreateSchema),
  transaction(),
  async (ctx: APIContext<T.TemplatesCreateReq>) => {
    const { id, title, data, icon, color, collectionId } = ctx.input.body;
    const editorVersion = ctx.headers["x-editor-version"] as string | undefined;

    const { transaction } = ctx.state;
    const { user } = ctx.state.auth;
    authorize(user, "createTemplate", user.team);

    let collection;
    if (collectionId) {
      collection = await Collection.findByPk(collectionId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "createDocument", collection);
    }

    let template = await Template.createWithCtx(ctx, {
      id,
      title,
      icon,
      color,
      content: data,
      collectionId: collection?.id,
      publishedAt: new Date(),
      createdById: user.id,
      lastModifiedById: user.id,
      teamId: user.teamId,
      editorVersion,
    });

    template = await Template.findByPk(template.id, {
      userId: user.id,
      rejectOnEmpty: true,
      transaction,
    });

    ctx.body = {
      data: presentTemplate(template),
      policies: presentPolicies(user, [template]),
    };
  }
);

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
      where[Op.and].push({ collectionId });
      const collection = await Collection.findByPk(collectionId, {
        userId: user.id,
      });
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
          method: ["withMembership", user.id],
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
      templates.map((template) => presentTemplate(template))
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

    ctx.body = {
      data: presentTemplate(template),
      policies: presentPolicies(user, [template]),
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
  "templates.restore",
  auth(),
  validate(T.TemplatesInfoSchema),
  transaction(),
  async (ctx: APIContext<T.TemplatesInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const template = await Template.findByPk(id, {
      userId: user.id,
      rejectOnEmpty: true,
      transaction,
      paranoid: false,
    });
    authorize(user, "restore", template);

    await template.restoreWithCtx(ctx);

    ctx.body = {
      data: presentTemplate(template),
      policies: presentPolicies(user, [template]),
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
    const { id, title, collectionId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const original = await Template.findByPk(id, {
      userId: user.id,
      rejectOnEmpty: true,
      transaction,
    });
    authorize(user, "duplicate", original);

    const targetCollectionId =
      collectionId === undefined ? original.collectionId : collectionId;
    if (targetCollectionId) {
      const collection = await Collection.findByPk(targetCollectionId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "createDocument", collection);
    } else {
      authorize(user, "createTemplate", user.team);
    }

    let template = await Template.createWithCtx(ctx, {
      title: title ?? original.title,
      createdById: user.id,
      lastModifiedById: user.id,
      teamId: user.teamId,
      collectionId: targetCollectionId,
      publishedAt: new Date(),
      content: original.content,
      icon: original.icon,
      color: original.color,
      fullWidth: original.fullWidth,
    });

    // reload to get all of the data needed to present (user, collection etc)
    template = await Template.findByPk(template.id, {
      userId: user.id,
      rejectOnEmpty: true,
      transaction,
    });

    ctx.body = {
      data: presentTemplate(template),
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
      transaction,
    });
    authorize(user, "update", template);

    if (updatedFields.collectionId !== undefined) {
      if (updatedFields.collectionId) {
        const collection = await Collection.findByPk(
          updatedFields.collectionId,
          {
            userId: user.id,
            transaction,
          }
        );
        authorize(user, "update", collection);
      } else {
        authorize(user, "createTemplate", user.team);
      }
    }

    if (data) {
      template.content = data;
    }

    await template.updateWithCtx(ctx, updatedFields);

    ctx.body = {
      data: presentTemplate(template),
      policies: presentPolicies(user, [template]),
    };
  }
);

export default router;
