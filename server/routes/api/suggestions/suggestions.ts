import Router from "koa-router";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Group, User } from "@server/models";
import {
  FamiliarityHelper,
  type FamiliarityScores,
} from "@server/models/helpers/FamiliarityHelper";
import SearchProviderManager from "@server/utils/SearchProviderManager";
import { QueryHelper } from "@server/storage/QueryHelper";
import { can } from "@server/policies";
import {
  presentDocuments,
  presentGroup,
  presentUser,
} from "@server/presenters";
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

    const suggestUsers = async (): Promise<{
      users: User[];
      familiarity: FamiliarityScores;
    }> => {
      if (!can(actor, "listUsers", actor.team)) {
        return { users: [], familiarity: {} };
      }

      const groupIds = await actor.groupIds();
      const users = await User.findAll({
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
        order: [...FamiliarityHelper.userOrder(groupIds), ["name", "ASC"]],
        replacements: {
          query: QueryHelper.likeContains(query ?? ""),
          groupIds,
        },
        offset,
        limit,
      });

      return {
        users,
        familiarity: await FamiliarityHelper.forUsers(users, groupIds),
      };
    };

    const [documents, { users, familiarity }, groups, collections] =
      await Promise.all([
        SearchProviderManager.getProvider().searchTitlesForUser(actor, {
          query,
          offset,
          limit,
          filter: {
            operator: "AND",
            filters: [
              { field: "archivedAt", operator: "isNull" },
              { field: "publishedAt", operator: "isNotNull" },
            ],
          },
        }),
        suggestUsers(),
        can(actor, "listGroups", actor.team)
          ? Group.findAll({
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
              replacements: { query: QueryHelper.likeContains(query ?? "") },
              offset,
              limit,
            })
          : [],
        SearchProviderManager.getProvider().searchCollectionsForUser(actor, {
          query,
          offset,
          limit,
        }),
      ]);

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        documents: await presentDocuments(ctx, documents),
        users: users.map((user) =>
          presentUser(user, {
            includeEmail: !!can(actor, "readEmail", user),
            includeDetails: !!can(actor, "readDetails", user),
          })
        ),
        groups: await Promise.all(groups.map((group) => presentGroup(group))),
        collections,
        familiarity,
      },
    };
  }
);

export default router;
