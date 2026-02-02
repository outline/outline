import Router from "koa-router";
import { Op, QueryTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { StatusFilter } from "@shared/types";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Document, Group, User } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import SearchHelper from "@server/models/helpers/SearchHelper";
import { can } from "@server/policies";
import { presentDocument, presentGroup, presentUser } from "@server/presenters";
import type { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "suggestions.mention",
  auth(),
  pagination(),
  validate(T.SuggestionsListSchema),
  async (ctx: APIContext<T.SuggestionsListReq>) => {
    const { query } = ctx.input.body;
    const { offset, limit } = ctx.state.pagination;
    const actor = ctx.state.auth.user;

    const [documents, users, groups, collections] = await Promise.all([
      SearchHelper.searchTitlesForUser(actor, {
        query,
        offset,
        limit,
        statusFilter: [StatusFilter.Published],
      }),
      User.findAll({
        where: {
          teamId: actor.teamId,
          suspendedAt: {
            [Op.eq]: null,
          },
          [Op.and]: query
            ? {
              [Op.or]: [
                Sequelize.literal(
                  `unaccent(LOWER(email)) like unaccent(LOWER(:query))`
                ),
                Sequelize.literal(
                  `unaccent(LOWER(name)) like unaccent(LOWER(:query))`
                ),
              ],
            }
            : {},
        },
        order: [["name", "ASC"]],
        replacements: { query: `%${query}%` },
        offset,
        limit,
      }),
      Group.findAll({
        where: {
          teamId: actor.teamId,
          disableMentions: false,
          [Op.and]: query
            ? Sequelize.literal(
              `unaccent(LOWER(name)) like unaccent(LOWER(:query))`
            )
            : {},
        },
        order: [["name", "ASC"]],
        replacements: { query: `%${query}%` },
        offset,
        limit,
      }),
      SearchHelper.searchCollectionsForUser(actor, { query, offset, limit }),
    ]);

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        documents: await Promise.all(
          documents.map((document) => presentDocument(ctx, document))
        ),
        users: users.map((user) =>
          presentUser(user, {
            includeEmail: !!can(actor, "readEmail", user),
            includeDetails: !!can(actor, "readDetails", user),
          })
        ),
        groups: await Promise.all(groups.map((group) => presentGroup(group))),
        collections,
      },
    };
  }
);

router.post(
  "suggestions.hashtag",
  auth(),
  pagination(),
  validate(T.SuggestionsListSchema),
  async (ctx: APIContext<T.SuggestionsListReq>) => {
    const { query } = ctx.input.body;
    const { limit } = ctx.state.pagination;
    const actor = ctx.state.auth.user;

    // Get all unique tags from documents the user has access to
    // and filter by the query if provided
    const tags = await Document.unscoped().findAll({
      attributes: [
        [Sequelize.fn("DISTINCT", Sequelize.fn("unnest", Sequelize.col("tags"))), "tag"],
      ],
      where: {
        teamId: actor.teamId,
        publishedAt: {
          [Op.ne]: null,
        },
        archivedAt: {
          [Op.is]: null,
        },
        ...(query ? {
          tags: {
            [Op.overlap]: Sequelize.literal(`ARRAY[LOWER(:query)]::varchar[]`)
          }
        } : {})
      },
      replacements: { query: `%${query}%` },
      raw: true,
    });

    let hashtags = tags.map((t: unknown) => (t as { tag: string }).tag);

    // Filter by query if overlap is too broad (e.g. partial matches)
    if (query) {
      const queryLower = query.toLowerCase();
      hashtags = hashtags.filter((tag) => tag.toLowerCase().includes(queryLower));
    }

    // Sort and limit
    hashtags.sort();
    hashtags = hashtags.slice(0, limit || 25);

    ctx.body = {
      data: {
        hashtags,
      },
    };
  }
);

export default router;
