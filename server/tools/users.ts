import { z } from "zod";
import { Op, Sequelize } from "sequelize";
import type { WhereOptions } from "sequelize";
import {
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { UserRole } from "@shared/types";
import { User, Team } from "@server/models";
import { authorize, can } from "@server/policies";
import { presentUser } from "@server/presenters";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import { error, success, getActorFromContext, withTracing } from "./util";

/**
 * Resolves a user identifier to a User model instance. Accepts special
 * tokens "self", "me", or "current_user" to return the authenticated user,
 * otherwise looks the user up by primary key.
 *
 * @param id - the user identifier or self-referencing token.
 * @param actor - the currently authenticated user.
 * @returns the resolved User instance.
 */
async function resolveUser(id: string, actor: User): Promise<User> {
  if (new Set(["self", "me", "current_user"]).has(id.toLowerCase())) {
    return actor;
  }

  return await User.findByPk(id, {
    rejectOnEmpty: true,
  });
}

/**
 * Registers user-related MCP tools and resources on the given server,
 * filtered by the OAuth scopes granted to the current token.
 *
 * @param server - the MCP server instance to register on.
 * @param scopes - the OAuth scopes granted to the access token.
 */
export function userTools(server: McpServer, scopes: string[]) {
  if (AuthenticationHelper.canAccess("users.info", scopes)) {
    server.registerResource(
      "get_user",
      new ResourceTemplate("outline://users/{id}", { list: undefined }),
      {
        title: "Get user",
        description:
          'Fetches a user by their ID. Use "current_user" as the ID to get the currently authenticated user.',
        mimeType: "application/json",
      },
      withTracing("get_user", async (uri, variables, extra) => {
        try {
          const { id } = variables;
          const actor = getActorFromContext(extra);
          const user = await resolveUser(String(id), actor);

          authorize(actor, "read", user);

          const presented = presentUser(user, {
            includeEmail: !!can(actor, "readEmail", user),
            includeDetails: !!can(actor, "readDetails", user),
          });

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(presented),
              },
            ],
          };
        } catch (err) {
          throw new McpError(
            ErrorCode.InvalidParams,
            err instanceof Error ? err.message : String(err)
          );
        }
      })
    );
  }

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
          query: z
            .string()
            .optional()
            .describe(
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
              "Filter users by status. 'suspended' is only available to admins. Defaults to active, non-suspended users."
            ),
          offset: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe("The pagination offset. Defaults to 0."),
          limit: z
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

            let where: WhereOptions<User> = {
              teamId: actor.teamId,
            };

            // Non-admins cannot see suspended users
            if (!actor.isAdmin) {
              where = {
                ...where,
                suspendedAt: { [Op.eq]: null },
              };
            }

            switch (filter) {
              case "invited": {
                where = { ...where, lastActiveAt: null };
                break;
              }
              case "suspended": {
                if (actor.isAdmin) {
                  where = {
                    ...where,
                    suspendedAt: { [Op.ne]: null },
                  };
                }
                break;
              }
              case "active": {
                where = {
                  ...where,
                  lastActiveAt: { [Op.ne]: null },
                  suspendedAt: { [Op.is]: null },
                };
                break;
              }
              case "all": {
                break;
              }
              default: {
                where = {
                  ...where,
                  suspendedAt: { [Op.is]: null },
                };
                break;
              }
            }

            if (role) {
              where = { ...where, role };
            }

            if (query) {
              where = {
                ...where,
                [Op.and]: {
                  [Op.or]: [
                    Sequelize.literal(
                      `unaccent(LOWER(email)) like unaccent(LOWER(:query))`
                    ),
                    Sequelize.literal(
                      `unaccent(LOWER(name)) like unaccent(LOWER(:query))`
                    ),
                  ],
                },
              };
            }

            const replacements = { query: `%${query}%` };

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
