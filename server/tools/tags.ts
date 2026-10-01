import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Tag } from "@server/models";
import { presentTag } from "@server/presenters";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import { error, success, getActorFromContext, withTracing } from "./util";

/**
 * Registers tag-related MCP tools on the given server, filtered by the
 * OAuth scopes granted to the current token.
 *
 * @param server - the MCP server instance to register on.
 * @param scopes - the OAuth scopes granted to the access token.
 */
export function tagTools(server: McpServer, scopes: string[]) {
  if (AuthenticationHelper.canAccess("tags.list", scopes)) {
    server.registerTool(
      "list_tags",
      {
        title: "List tags",
        description:
          "Lists the tags visible to the user — those attached to at least one document they can read. Each result includes documentCount, the number of readable, non-deleted, non-archived documents carrying the tag. Use a tag's name with list_documents to filter by it.",
        annotations: {
          idempotentHint: true,
          readOnlyHint: true,
        },
        inputSchema: {
          sort: z
            .enum(["name", "documentCount"])
            .optional()
            .describe('The field to sort tags by. Defaults to "name".'),
          direction: z
            .enum(["ASC", "DESC"])
            .optional()
            .describe(
              "The sort direction. Defaults to ascending for name, descending for documentCount."
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
        "list_tags",
        async ({ sort, direction, offset, limit }, extra) => {
          try {
            const user = getActorFromContext(extra);
            const effectiveSort = sort ?? "name";

            const results = await Tag.findAllReadable(user, {
              sort: effectiveSort,
              direction:
                direction ??
                (effectiveSort === "documentCount" ? "DESC" : "ASC"),
              offset: offset ?? 0,
              limit: limit ?? 25,
            });

            const presented = results.map(({ tag, documentCount }) =>
              presentTag(tag, documentCount)
            );

            return success(presented);
          } catch (message) {
            return error(message);
          }
        }
      )
    );
  }
}
