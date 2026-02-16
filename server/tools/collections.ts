import { z } from "zod";
import { Sequelize, Op, type WhereOptions } from "sequelize";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Collection } from "@server/models";
import { authorize } from "@server/policies";
import { presentCollection } from "@server/presenters";
import { success, error, getAuthFromContext } from "./util";

/**
 * Registers collection-related MCP tools on the given server.
 *
 * @param server - the MCP server instance to register tools on.
 */
export function collectionTools(server: McpServer) {
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
          .describe("An optional search query to filter collections by name."),
      },
    },
    async ({ query }, extra) => {
      try {
        const user = getAuthFromContext(extra);
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
        });

        const presented = await Promise.all(
          collections.map((collection) =>
            presentCollection(undefined, collection)
          )
        );
        return success(presented);
      } catch (message) {
        return error(message);
      }
    }
  );

  server.registerTool(
    "get_collection",
    {
      title: "Get collection",
      description:
        "Fetches the details of a collection by its ID, including its document structure.",
      annotations: {
        idempotentHint: true,
        readOnlyHint: true,
      },
      inputSchema: {
        id: z
          .string()
          .describe("The unique identifier of the collection to retrieve."),
      },
    },
    async ({ id }, extra) => {
      try {
        const user = getAuthFromContext(extra);
        const collection = await Collection.scope(
          "withDocumentStructure"
        ).findByPk(id, {
          rejectOnEmpty: true,
        });

        authorize(user, "read", collection);

        const presented = await presentCollection(undefined, collection);
        return success(presented);
      } catch (message) {
        return error(message);
      }
    }
  );
}
