import Router from "koa-router";
import { UniqueConstraintError } from "sequelize";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Tag, DocumentTag, Document, Event } from "@server/models";
import SavepointHelper from "@server/models/helpers/SavepointHelper";
import { authorize } from "@server/policies";
import { presentTag, presentPolicies } from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "tags.create",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.TagsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.TagsCreateReq>) => {
    const { name, color } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createTag", user.team);

    const [tag, created] = await SavepointHelper.findOrCreate(
      Tag,
      { name, teamId: user.teamId },
      ctx.state.transaction,
      (savepoint) =>
        Tag.create(
          { name, teamId: user.teamId, createdById: user.id, color },
          { ...ctx.context, transaction: savepoint, event: { publish: true } }
        )
    );

    ctx.body = {
      data: presentTag(tag, created ? 0 : undefined),
      policies: presentPolicies(user, [tag]),
    };
  }
);

router.post(
  "tags.update",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.TagsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.TagsUpdateReq>) => {
    const { transaction: t } = ctx.state;
    const { id, name, color } = ctx.input.body;
    const { user } = ctx.state.auth;

    const tag = await Tag.findOne({
      where: { id, teamId: user.teamId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    authorize(user, "update", tag);

    const changes = {
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color }),
    };

    try {
      await tag.updateWithCtx(ctx, changes);
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw ValidationError(`A tag named "${name}" already exists`);
      }
      throw err;
    }

    ctx.body = {
      data: presentTag(tag),
      policies: presentPolicies(user, [tag]),
    };
  }
);

router.post(
  "tags.delete",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
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

    await tag.destroyWithCtx(ctx, { data: { name: tag.name } });

    ctx.body = { success: true };
  }
);

router.post(
  "tags.merge",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.TagsMergeSchema),
  transaction(),
  async (ctx: APIContext<T.TagsMergeReq>) => {
    const { transaction: t } = ctx.state;
    const { sourceId, targetId } = ctx.input.body;
    const { user } = ctx.state.auth;

    // Locked together, ordered by id, so two concurrent merges that name
    // the same pair of tags in opposite directions (A→B here, B→A there)
    // always acquire their row locks in the same order instead of deadlocking.
    const tags = await Tag.findAll({
      where: { id: [sourceId, targetId], teamId: user.teamId },
      order: [["id", "ASC"]],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const source = tags.find((tag) => tag.id === sourceId) ?? null;
    const target = tags.find((tag) => tag.id === targetId) ?? null;
    authorize(user, "merge", source);
    authorize(user, "merge", target);

    // Documents already tagged with the target would collide with the
    // document_tags unique index if the source row were simply
    // repointed, so those rows are dropped; the rest move to the target.
    const targetDocumentTags = await DocumentTag.findAll({
      attributes: ["documentId"],
      where: { tagId: targetId },
      transaction: t,
    });
    const targetDocumentIds = targetDocumentTags.map((dt) => dt.documentId);

    await DocumentTag.destroy({
      where: { tagId: sourceId, documentId: targetDocumentIds },
      transaction: t,
    });
    await DocumentTag.update(
      { tagId: targetId },
      { where: { tagId: sourceId }, transaction: t }
    );

    // The source tag no longer has any document_tags rows to cascade, and
    // its removal is folded into the single tags.merge event below rather
    // than also recording a separate tags.delete event.
    await source.destroy({ transaction: t });

    await Event.create(
      {
        name: "tags.merge",
        modelId: target.id,
        teamId: user.teamId,
        actorId: user.id,
        ip: ctx.context.ip ?? null,
        authType: ctx.context.auth.type,
        data: { sourceId, sourceName: source.name },
      },
      { transaction: t }
    );

    ctx.body = {
      data: presentTag(
        target,
        await Tag.readableDocumentCount(user, target.id, { transaction: t })
      ),
      policies: presentPolicies(user, [target]),
    };
  }
);

router.post(
  "tags.list",
  auth(),
  pagination(),
  validate(T.TagsListSchema),
  async (ctx: APIContext<T.TagsListReq>) => {
    const { user } = ctx.state.auth;
    const { sort, direction } = ctx.input.body;

    // The exact total is always counted, rather than estimated for client
    // requests as paginateQuery does, because the client's Store.fetchAll
    // derives the number of pages to request from it.
    const [results, total] = await Promise.all([
      Tag.findAllReadable(user, {
        sort,
        direction: direction ?? (sort === "documentCount" ? "DESC" : "ASC"),
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Tag.countReadable(user),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: results.map(({ tag, documentCount }) =>
        presentTag(tag, documentCount)
      ),
      policies: presentPolicies(
        user,
        results.map(({ tag }) => tag)
      ),
    };
  }
);

router.post(
  "tags.add",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.TagsAddSchema),
  transaction(),
  async (ctx: APIContext<T.TagsAddReq>) => {
    const { transaction: t } = ctx.state;
    const { tagId, documentId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const [tag, document] = await Promise.all([
      // Share lock so a concurrent delete cannot remove the tag before the
      // document_tags row referencing it is inserted.
      Tag.findOne({
        where: { id: tagId, teamId: user.teamId },
        transaction: t,
        lock: t.LOCK.SHARE,
      }),
      Document.findByPk(documentId, { userId: user.id, transaction: t }),
    ]);

    authorize(user, "read", tag);
    authorize(user, "update", document);

    await SavepointHelper.findOrCreate(
      DocumentTag,
      { tagId, documentId },
      t,
      (savepoint) =>
        DocumentTag.create(
          { tagId, documentId, createdById: user.id },
          {
            ...ctx.context,
            transaction: savepoint,
            event: { name: "add", data: { tagId }, publish: true },
          }
        )
    );

    ctx.body = { success: true };
  }
);

router.post(
  "tags.remove",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.TagsRemoveSchema),
  transaction(),
  async (ctx: APIContext<T.TagsRemoveReq>) => {
    const { transaction: t } = ctx.state;
    const { tagId, documentId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const [tag, document] = await Promise.all([
      Tag.findOne({
        where: { id: tagId, teamId: user.teamId },
        transaction: t,
      }),
      Document.findByPk(documentId, { userId: user.id, transaction: t }),
    ]);

    authorize(user, "read", tag);
    authorize(user, "update", document);

    const dt = await DocumentTag.findOne({
      where: { tagId, documentId },
      transaction: t,
    });

    if (dt) {
      await dt.destroyWithCtx(ctx, { name: "remove", data: { tagId } });
    }

    ctx.body = { success: true };
  }
);

export default router;
