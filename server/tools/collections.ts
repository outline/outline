import { z } from "zod";
import { Sequelize, Op, type WhereOptions } from "sequelize";
import {
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { CollectionPermission } from "@shared/types";
import { Collection, Team } from "@server/models";
import { authorize } from "@server/policies";
import { presentCollection } from "@server/presenters";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import {
  success,
  error,
  getActorFromContext,
  buildAPIContext,
  pathToUrl,
  withTracing,
} from "./util";

/**
 * Registers collection-related MCP tools and resources on the given server,
 * filtered by the OAuth scopes granted to the current token.
 *
 * @param server - the MCP server instance to register on.
 * @param scopes - the OAuth scopes granted to the access token.
 */
export function collectionTools(server: McpServer, scopes: string[]) {
  if (AuthenticationHelper.canAccess("collections.list", scopes)) {
    server.registerTool(
      "list_collections",
      {
        title: "List collections",
        description:
          "Lists all collections the authenticated user has access to. Returns a summary of each collection.",
        annotations: {
          idempotentHint: true,
          readOnlyHint: true,
        },
        inputSchema: {
          query: z
            .string()
            .optional()
            .describe(
              "An optional search query to filter collections by name."
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
        "list_collections",
        async ({ query, offset, limit }, extra) => {
          try {
            const user = getActorFromContext(extra);
            const collectionIds = await user.collectionIds();

            const and: WhereOptions<Collection>[] = [
              { deletedAt: { [Op.eq]: null } },
              { archivedAt: { [Op.eq]: null } },
              { id: collectionIds },
            ];

            if (query) {
              and.push(
                Sequelize.literal(
                  `unaccent(LOWER(name)) like unaccent(LOWER(:query))`
                ) as unknown as WhereOptions<Collection>
              );
            }

            const where: WhereOptions<Collection> = {
              teamId: user.teamId,
              [Op.and]: and,
            };

            const collections = await Collection.scope({
              method: ["withMembership", user.id],
            }).findAll({
              where,
              replacements: { query: `%${query}%` },
              order: [
                Sequelize.literal('"collection"."index" collate "C"'),
                ["updatedAt", "DESC"],
              ],
              offset: offset ?? 0,
              limit: limit ?? 25,
            });

            const presented = await Promise.all(
              collections.map(async (collection) =>
                pathToUrl(
                  user.team,
                  await presentCollection(undefined, collection)
                )
              )
            );
            return success(presented);
          } catch (message) {
            return error(message);
          }
        }
      )
    );
  }

  if (AuthenticationHelper.canAccess("collections.info", scopes)) {
    server.registerResource(
      "get_collection",
      new ResourceTemplate("outline://collections/{id}", { list: undefined }),
      {
        title: "Get collection",
        description:
          "Fetches the details of a collection by its ID, including its document structure.",
        mimeType: "application/json",
      },
      withTracing("get_collection", async (uri, variables, extra) => {
        try {
          const { id } = variables;
          const user = getActorFromContext(extra);
          const collection = await Collection.findByPk(String(id), {
            includeDocumentStructure: true,
            rejectOnEmpty: true,
          });

          authorize(user, "read", collection);

          const presented = await presentCollection(undefined, collection);
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(pathToUrl(user.team, presented)),
              },
              {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(collection.documentStructure ?? []),
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

  if (AuthenticationHelper.canAccess("collections.create", scopes)) {
    server.registerTool(
      "create_collection",
      {
        title: "Create collection",
        description:
          "Creates a new collection. Collections are used to organize documents.",
        annotations: {
          idempotentHint: false,
          readOnlyHint: false,
        },
        inputSchema: {
          name: z.string().describe("The name of the collection."),
          description: z
            .string()
            .optional()
            .describe("A markdown description for the collection."),
          icon: z
            .string()
            .optional()
            .describe("An icon for the collection, e.g. an emoji."),
          color: z
            .string()
            .optional()
            .describe("The hex color for the collection icon, e.g. #FF0000."),
        },
      },
      withTracing("create_collection", async (input, context) => {
        try {
          const ctx = buildAPIContext(context);
          const { user } = ctx.state.auth;
          const team = await Team.findByPk(user.teamId, {
            rejectOnEmpty: true,
          });
          authorize(user, "createCollection", team);

          const collection = Collection.build({
            name: input.name,
            description: input.description,
            icon: input.icon,
            color: input.color,
            teamId: user.teamId,
            createdById: user.id,
            permission: CollectionPermission.ReadWrite,
          });

          await collection.saveWithCtx(ctx);

          const reloaded = await Collection.findByPk(collection.id, {
            userId: user.id,
            rejectOnEmpty: true,
          });

          const presented = pathToUrl(
            user.team,
            await presentCollection(undefined, reloaded)
          );
          return success(presented);
        } catch (message) {
          return error(message);
        }
      })
    );
  }

  if (AuthenticationHelper.canAccess("collections.update", scopes)) {
    server.registerTool(
      "update_collection",
      {
        title: "Update collection",
        description:
          "Updates an existing collection by its ID. Only the fields provided will be updated.",
        annotations: {
          idempotentHint: true,
          readOnlyHint: false,
        },
        inputSchema: {
          id: z
            .string()
            .describe("The unique identifier of the collection to update."),
          name: z
            .string()
            .optional()
            .describe("The new name for the collection."),
          description: z
            .string()
            .optional()
            .describe("The new markdown description for the collection."),
          icon: z
            .string()
            .nullable()
            .optional()
            .describe(
              "An icon for the collection, e.g. an emoji. Set to null to remove."
            ),
          color: z
            .string()
            .nullable()
            .optional()
            .describe(
              "The hex color for the collection icon. Set to null to remove."
            ),
        },
      },
      withTracing("update_collection", async (input, context) => {
        try {
          const ctx = buildAPIContext(context);
          const { user } = ctx.state.auth;

          const collection = await Collection.findByPk(input.id, {
            userId: user.id,
            rejectOnEmpty: true,
          });
          authorize(user, "update", collection);

          if (input.name !== undefined) {
            collection.name = input.name.trim();
          }
          if (input.description !== undefined) {
            collection.description = input.description;
          }
          if (input.icon !== undefined) {
            collection.icon = input.icon;
          }
          if (input.color !== undefined) {
            collection.color = input.color;
          }

          await collection.saveWithCtx(ctx);

          const presented = pathToUrl(
            user.team,
            await presentCollection(undefined, collection)
          );
          return success(presented);
        } catch (message) {
          return error(message);
        }
      })
    );
  }
}
