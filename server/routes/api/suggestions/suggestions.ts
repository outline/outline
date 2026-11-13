import Router from "@koa/router";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { Second } from "@shared/utils/time";
import { withinTimeLimit } from "@shared/utils/timers";
import { addTags, getRootSpanFromRequestContext } from "@server/logging/tracer";
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

/** The time each section of the suggestions may take before it is left out. */
const sectionTimeLimit = Second.ms;

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

      const canReadEmails = can(actor, "readEmail", actor.team);
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
                  ...(canReadEmails
                    ? [
                        Sequelize.literal(
                          `unaccent(LOWER(email)) like unaccent(LOWER(:query))`
                        ),
                      ]
                    : []),
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

    const timedOut: string[] = [];
    const withinLimit = <T>(
      section: string,
      run: () => Promise<T>,
      fallback: T
    ) =>
      withinTimeLimit(run, sectionTimeLimit, fallback, () => {
        timedOut.push(section);
      });

    const [documents, { users, familiarity }, groups, collections] =
      await Promise.all([
        withinLimit(
          "documents",
          () =>
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
          []
        ),
        withinLimit("users", suggestUsers, { users: [], familiarity: {} }),
        withinLimit(
          "groups",
          async () =>
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
                  replacements: {
                    query: QueryHelper.likeContains(query ?? ""),
                  },
                  offset,
                  limit,
                })
              : [],
          []
        ),
        withinLimit(
          "collections",
          () =>
            SearchProviderManager.getProvider().searchCollectionsForUser(
              actor,
              {
                query,
                offset,
                limit,
              }
            ),
          []
        ),
      ]);

    if (timedOut.length) {
      addTags(
        { "suggestions.timedOut": timedOut.join(",") },
        getRootSpanFromRequestContext(ctx)
      );
    }

    const [presentedDocuments, presentedGroups] = await Promise.all([
      presentDocuments(ctx, documents),
      Promise.all(groups.map((group) => presentGroup(group))),
    ]);

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        documents: presentedDocuments,
        users: users.map((user) =>
          presentUser(user, {
            includeEmail: !!can(actor, "readEmail", user),
            includeDetails: !!can(actor, "readDetails", user),
          })
        ),
        groups: presentedGroups,
        collections,
        familiarity,
      },
    };
  }
);

export default router;
