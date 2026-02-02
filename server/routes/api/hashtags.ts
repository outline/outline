import Router from "koa-router";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import auth from "@server/middlewares/authentication";
import pagination from "./middlewares/pagination";
import { presentDocument, presentPolicies } from "@server/presenters";
import { Document } from "@server/models";
import type { APIContext } from "@server/types";
import { ValidationError } from "@server/errors";

const router = new Router();

router.post("hashtags.list", auth(), async (ctx: APIContext) => {
  const actor = ctx.state.auth.user;
  const body = ctx.request.body as Record<string, unknown>;
  const sort = body?.sort === "count" ? "count" : "alpha";
  const limit = typeof body?.limit === "number" ? body.limit : undefined;

  const rows = (await Document.unscoped().findAll({
    attributes: [
      [Sequelize.fn("unnest", Sequelize.col("tags")), "tag"],
      [Sequelize.fn("count", Sequelize.literal("*")), "count"],
    ],
    where: {
      teamId: actor.teamId,
      publishedAt: {
        [Op.ne]: null,
      },
      archivedAt: {
        [Op.is]: null,
      },
      deletedAt: {
        [Op.is]: null,
      },
    },
    group: ["tag"],
    raw: true,
  })) as unknown as Array<{ tag: string; count: string | number }>;

  const tagCounts: Record<string, number> = {};
  for (const row of rows) {
    if (!row.tag) {
      continue;
    }
    const count =
      typeof row.count === "number" ? row.count : Number(row.count);
    tagCounts[row.tag] = Number.isNaN(count) ? 0 : count;
  }

  let tags = Object.keys(tagCounts);
  tags =
    sort === "count"
      ? tags.sort((a, b) => {
        const countA = tagCounts[a] ?? 0;
        const countB = tagCounts[b] ?? 0;
        return countB === countA ? a.localeCompare(b) : countB - countA;
      })
      : tags.sort((a, b) => a.localeCompare(b));

  if (limit !== undefined) {
    tags = tags.slice(0, limit);
  }

  ctx.body = {
    data: tags,
    counts: tagCounts,
  };
});

router.post(
  "hashtags.documents",
  auth(),
  pagination(),
  async (ctx: APIContext) => {
    const actor = ctx.state.auth.user;
    const body = ctx.request.body as Record<string, unknown>;
    const tagValue = typeof body?.tag === "string" ? body.tag.trim() : "";

    if (!tagValue) {
      throw ValidationError("Hashtag is required");
    }

    const { offset, limit } = ctx.state.pagination;
    const tag = tagValue.toLowerCase();

    const documents = await Document.withMembershipScope(actor.id).findAll({
      where: {
        teamId: actor.teamId,
        publishedAt: {
          [Op.ne]: null,
        },
        archivedAt: {
          [Op.is]: null,
        },
        deletedAt: {
          [Op.is]: null,
        },
        tags: {
          [Op.contains]: [tag],
        },
      },
      order: [["updatedAt", "DESC"]],
      offset,
      limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: await Promise.all(
        documents.map((document) => presentDocument(ctx, document))
      ),
      policies: presentPolicies(actor, documents),
    };
  }
);

export default router;
