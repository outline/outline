import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentDocument } from "@server/presenters";
import { success, error, getAuthFromContext } from "./util";

/**
 * Registers document-related MCP tools on the given server.
 *
 * @param server - the MCP server instance to register tools on.
 */
export function documentTools(server: McpServer) {
  // @ts-expect-error Need to update Zod.
  server.registerTool(
    "get_document",
    {
      title: "Get document",
      description: "Fetches the content of a document by its ID.",
      annotations: {
        idempotentHint: true,
        readOnlyHint: true,
      },
      inputSchema: {
        id: z
          .string()
          .describe("The unique identifier of the document to retrieve."),
      },
    },
    async ({ id }, context) => {
      try {
        const user = await getAuthFromContext(context);
        const document = await Document.findByPk(id, {
          userId: user.id,
          rejectOnEmpty: true,
        });

        authorize(user, "read", document);

        const presented = await presentDocument(undefined, document);
        return success(presented);
      } catch (message) {
        return error(message);
      }
    }
  );
}
