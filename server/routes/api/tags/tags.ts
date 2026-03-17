import Router from "koa-router";
import { Sequelize } from "sequelize";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Tag, DocumentTag, Document, Event } from "@server/models";
import { authorize } from "@server/policies";
import { presentTag, presentPolicies } from "@server/presenters";
import type { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "tags.create",
  auth(),
  validate(T.TagsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.TagsCreateReq>) => {
    const { transaction: t } = ctx.state;
    const { name } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createTag", user.team);

    const normalizedName = name.trim().toLowerCase();
    const [tag] = await Tag.findOrCreate({
      where: { name: normalizedName, teamId: user.teamId },
      defaults: {
        name: normalizedName,
        teamId: user.teamId,
        createdById: user.id,
      },
      transaction: t,
    });

    await Event.schedule({
      name: "tags.create",
      modelId: tag.id,
      teamId: user.teamId,
      actorId: user.id,
    });

    ctx.body = {
      data: presentTag(tag),
      policies: presentPolicies(user, [tag]),
    };
  }
);

router.post(
  "tags.update",
  auth(),
  validate(T.TagsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.TagsUpdateReq>) => {
    const { transaction: t } = ctx.state;
    const { id, name } = ctx.input.body;
    const { user } = ctx.state.auth;

    const tag = await Tag.findOne({
      where: { id, teamId: user.teamId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    authorize(user, "update", tag);

    await tag.update({ name: name.trim().toLowerCase() }, { transaction: t });

    await Event.schedule({
      name: "tags.update",
      modelId: tag.id,
      teamId: user.teamId,
      actorId: user.id,
    });

    ctx.body = {
      data: presentTag(tag),
      policies: presentPolicies(user, [tag]),
    };
  }
);

router.post(
  "tags.delete",
  auth(),
  validate(T.TagsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.TagsDeleteReq>) => {
    const { transaction: t } = ctx.state;
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const tag = await Tag.findOne({
      where: { id, teamId: user.teamId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    authorize(user, "delete", tag);

    await tag.destroy({ transaction: t });

    await Event.schedule({
      name: "tags.delete",
      modelId: id,
      teamId: user.teamId,
      actorId: user.id,
    });

    ctx.body = { success: true };
  }
);

router.post(
  "tags.list",
  auth(),
  pagination(),
  validate(T.TagsListSchema),
  async (ctx: APIContext<T.TagsListReq>) => {
    const { user } = ctx.state.auth;

    const tags = await Tag.findAll({
      where: { teamId: user.teamId },
      attributes: {
        include: [
          [
            Sequelize.literal(
              `(SELECT COUNT(*) FROM document_tags WHERE document_tags."tagId" = "tag"."id")`
            ),
            "documentCount",
          ],
        ],
      },
      order: [[Sequelize.literal('"documentCount"'), "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: tags.map((tag) =>
        presentTag(tag, Number((tag as Tag & { dataValues: { documentCount: string } }).dataValues.documentCount))
      ),
      policies: presentPolicies(user, tags),
    };
  }
);

router.post(
  "tags.add",
  auth(),
  validate(T.TagsAddSchema),
  transaction(),
  async (ctx: APIContext<T.TagsAddReq>) => {
    const { transaction: t } = ctx.state;
    const { tagId, documentId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const [tag, document] = await Promise.all([
      Tag.findOne({ where: { id: tagId, teamId: user.teamId }, transaction: t }),
      Document.findByPk(documentId, { userId: user.id, transaction: t }),
    ]);

    authorize(user, "read", tag);
    authorize(user, "update", document);

    const [dt] = await DocumentTag.findOrCreate({
      where: { tagId, documentId },
      defaults: { tagId, documentId, createdById: user.id },
      transaction: t,
    });

    await Event.schedule({
      name: "tags.add",
      modelId: dt.id,
      tagId,
      documentId,
      teamId: user.teamId,
      actorId: user.id,
    });

    ctx.body = { success: true };
  }
);

router.post(
  "tags.remove",
  auth(),
  validate(T.TagsRemoveSchema),
  transaction(),
  async (ctx: APIContext<T.TagsRemoveReq>) => {
    const { transaction: t } = ctx.state;
    const { tagId, documentId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const document = await Document.findByPk(documentId, {
      userId: user.id,
      transaction: t,
    });
    authorize(user, "update", document);

    const dt = await DocumentTag.findOne({
      where: { tagId, documentId },
      transaction: t,
    });
    await DocumentTag.destroy({ where: { tagId, documentId }, transaction: t });

    await Event.schedule({
      name: "tags.remove",
      modelId: dt?.id ?? tagId,
      tagId,
      documentId,
      teamId: user.teamId,
      actorId: user.id,
    });

    ctx.body = { success: true };
  }
);

export default router;
