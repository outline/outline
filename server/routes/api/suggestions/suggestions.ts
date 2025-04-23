import Router from "koa-router";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { User } from "@server/models";
import SearchHelper from "@server/models/helpers/SearchHelper";
import { can } from "@server/policies";
import { presentDocument, presentUser } from "@server/presenters";
import { APIContext } from "@server/types";
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

    const [documents, users, collections] = await Promise.all([
      SearchHelper.searchTitlesForUser(actor, {
        query,
        offset,
        limit,
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
        collections,
      },
    };
  }
);

export default router;
