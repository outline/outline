import { z } from "zod";
import { Op, Sequelize } from "sequelize";
import type { WhereOptions } from "sequelize";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { User, Team } from "@server/models";
import {
  buildWhere,
  combineFilters,
  hasFieldInFilter,
  UsersFilterListSchema,
} from "@server/models/helpers/Filters";
import { authorize, can } from "@server/policies";
import { presentUser } from "@server/presenters";
import { QueryHelper } from "@server/storage/QueryHelper";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import {
  error,
  success,
  getActorFromContext,
  optionalString,
  withTracing,
} from "./util";

/**
 * Registers user-related MCP tools on the given server, filtered by the
 * OAuth scopes granted to the current token.
 *
 * @param server - the MCP server instance to register on.
 * @param scopes - the OAuth scopes granted to the access token.
 */
export function userTools(server: McpServer, scopes: string[]) {
  if (AuthenticationHelper.canAccess("users.list", scopes)) {
    server.registerTool(
      "list_users",
      {
        title: "List users",
        description:
          "Lists users in the workspace. Returns non-suspended users unless the filters say otherwise.",
        annotations: {
          idempotentHint: true,
          readOnlyHint: true,
        },
        inputSchema: {
          query: optionalString().describe(
            "An optional search query to filter users by name or email."
          ),
          filters: UsersFilterListSchema.optional().describe(
            [
              "Filter expressions, combined with AND. Each entry is either a condition",
              "{ field, operator, value } or a group { operator: 'AND' | 'OR', filters: [...] }.",
              "Fields: id, name, email, role, createdAt, updatedAt, lastActiveAt, suspendedAt.",
              "Operators: eq, neq, lt, lte, gt, gte, contains, startsWith, endsWith, in, notIn, isNull, isNotNull.",
              "Date fields take an ISO 8601 date, or a duration relative to now such as '-P30D'.",
              "The role field accepts admin, member, viewer or guest, with eq, neq, in or notIn only.",
              "Users who have never signed in have lastActiveAt isNull.",
              "Suspended users are excluded unless an expression references suspendedAt,",
              "and are only ever visible to admins.",
            ].join(" ")
          ),
          offset: z.coerce
            .number()
            .int()
            .min(0)
            .optional()
            .describe("The pagination offset. Defaults to 0."),
          limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe(
              "The maximum number of results to return. Defaults to 25, max 100."
            ),
        },
      },
      withTracing(
        "list_users",
        async ({ query, filters, offset, limit }, extra) => {
          try {
            const actor = getActorFromContext(extra);
            const team = await Team.findByPk(actor.teamId, {
              rejectOnEmpty: true,
            });
            authorize(actor, "listUsers", team);

            const effectiveOffset = offset ?? 0;
            const effectiveLimit = limit ?? 25;

            const where: WhereOptions<User> & {
              [Op.and]: WhereOptions<User>[];
            } = {
              teamId: actor.teamId,
              [Op.and]: [],
            };

            const filter = combineFilters(filters);

            // Suspended users are only ever visible to admins, and then only
            // when the expression references suspendedAt. Matches users.list.
            const includeSuspended =
              actor.isAdmin &&
              filter !== undefined &&
              hasFieldInFilter(filter, "suspendedAt");
            if (!includeSuspended) {
              where[Op.and].push({ suspendedAt: { [Op.is]: null } });
            }

            if (filter) {
              where[Op.and].push(buildWhere<User>(filter));
            }

            if (query) {
              where[Op.and].push({
                [Op.or]: [
                  Sequelize.literal(
                    `unaccent(LOWER(email)) like unaccent(LOWER(:query))`
                  ),
                  Sequelize.literal(
                    `unaccent(LOWER(name)) like unaccent(LOWER(:query))`
                  ),
                ],
              });
            }

            const replacements = {
              query: QueryHelper.likeContains(query ?? ""),
            };

            const users = await User.findAll({
              where,
              replacements,
              order: [["name", "ASC"]],
              offset: effectiveOffset,
              limit: effectiveLimit,
            });

            const presented = users.map((user) =>
              presentUser(user, {
                includeEmail: !!can(actor, "readEmail", user),
                includeDetails: !!can(actor, "readDetails", user),
              })
            );

            return success(presented);
          } catch (err) {
            return error(err);
          }
        }
      )
    );
  }
}
