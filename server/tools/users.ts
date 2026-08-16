import { z } from "zod";
import { Op, Sequelize } from "sequelize";
import type { WhereOptions } from "sequelize";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { UserRole } from "@shared/types";
import { User, Team } from "@server/models";
import {
  buildWhere,
  legacyUserParamsToFilter,
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
        description: "Lists users in the workspace.",
        annotations: {
          idempotentHint: true,
          readOnlyHint: true,
        },
        inputSchema: {
          query: optionalString().describe(
            "An optional search query to filter users by name or email."
          ),
          role: z
            .enum([
              UserRole.Admin,
              UserRole.Member,
              UserRole.Viewer,
              UserRole.Guest,
            ])
            .optional()
            .describe("Filter users by role."),
          filter: z
            .enum(["active", "suspended", "invited", "all"])
            .optional()
            .describe(
              "Filter users by status. Defaults to active, non-suspended users. Note filtering by 'suspended' is only available to admins."
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
        async ({ query, role, filter, offset, limit }, extra) => {
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

            const userFilter = legacyUserParamsToFilter({
              role,
              status: filter,
              isAdmin: actor.isAdmin,
            });

            // Suspended users are only ever visible to admins, and then only
            // when a specific status was requested. Matches users.list.
            if (!(actor.isAdmin && filter)) {
              where[Op.and].push({ suspendedAt: { [Op.is]: null } });
            }

            if (userFilter) {
              where[Op.and].push(buildWhere<User>(userFilter));
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
