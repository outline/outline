import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import documentCreator from "@server/commands/documentCreator";
import documentUpdater from "@server/commands/documentUpdater";
import { Collection, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentDocument } from "@server/presenters";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { error, buildAPIContext } from "./util";
import { TextEditMode } from "@shared/types";

/**
 * Registers document-related MCP tools on the given server.
 *
 * @param server - the MCP server instance to register tools on.
 */
export function documentTools(server: McpServer) {
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
    async (input, extra) => {
      try {
        const ctx = buildAPIContext(extra);
        const { user } = ctx.state.auth;
        const document = await Document.findByPk(input.id, {
          userId: user.id,
          rejectOnEmpty: true,
        });

        authorize(user, "read", document);

        const { text, ...attributes } = await presentDocument(
          undefined,
          document,
          {
            includeData: false,
            includeText: true,
            includeUpdatedAt: true,
          }
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(attributes),
            },
            {
              type: "text" as const,
              text: String(text ?? ""),
            },
          ],
        } satisfies CallToolResult;
      } catch (message) {
        return error(message);
      }
    }
  );

  server.registerTool(
    "create_document",
    {
      title: "Create document",
      description:
        "Creates a new document. Requires a collectionId to place the document in a collection, or parentDocumentId to nest it under an existing document. Set publish to true to make the document visible in the collection.",
      annotations: {
        idempotentHint: false,
        readOnlyHint: false,
      },
      inputSchema: {
        title: z.string().describe("The title of the document."),
        text: z
          .string()
          .optional()
          .describe("The markdown content of the document."),
        collectionId: z
          .string()
          .optional()
          .describe("The collection to place the document in."),
        parentDocumentId: z
          .string()
          .optional()
          .describe("The parent document ID to nest this document under."),
        icon: z
          .string()
          .optional()
          .describe("An icon for the document, e.g. an emoji."),
        color: z
          .string()
          .optional()
          .describe("The hex color for the document icon, e.g. #FF0000."),
      },
    },
    async (input, context) => {
      try {
        const { collectionId, parentDocumentId } = input;
        const ctx = buildAPIContext(context);
        const { user } = ctx.state.auth;
        let collection;
        let parentDocument;

        if (parentDocumentId) {
          parentDocument = await Document.findByPk(parentDocumentId, {
            userId: user.id,
          });

          if (parentDocument?.collectionId) {
            collection = await Collection.findByPk(
              parentDocument.collectionId,
              { userId: user.id }
            );
          }

          authorize(user, "createChildDocument", parentDocument, {
            collection,
          });
        } else if (collectionId) {
          collection = await Collection.findByPk(collectionId, {
            userId: user.id,
          });
          authorize(user, "createDocument", collection);
        }

        const document = await documentCreator(ctx, {
          title: input.title,
          text: input.text,
          icon: input.icon,
          color: input.color,
          parentDocumentId: parentDocumentId,
          publish: true,
          collectionId: collection?.id,
        });

        const { text, ...attributes } = await presentDocument(
          undefined,
          document,
          {
            includeData: false,
            includeText: true,
            includeUpdatedAt: true,
          }
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(attributes),
            },
            {
              type: "text" as const,
              text: String(text ?? ""),
            },
          ],
        } satisfies CallToolResult;
      } catch (message) {
        return error(message);
      }
    }
  );

  server.registerTool(
    "update_document",
    {
      title: "Update document",
      description:
        "Updates an existing document by its ID. Only the fields provided will be updated.",
      annotations: {
        idempotentHint: true,
        readOnlyHint: false,
      },
      inputSchema: {
        id: z
          .string()
          .describe("The unique identifier of the document to update."),
        title: z
          .string()
          .optional()
          .describe("The new title for the document."),
        text: z
          .string()
          .optional()
          .describe("The new markdown content for the document."),
        editMode: z
          .enum(TextEditMode)
          .optional()
          .describe("How to apply the text update. Defaults to replace."),
        collectionId: z
          .string()
          .optional()
          .describe(
            "The collection ID to publish a draft to, required when publishing a draft that has no collection."
          ),
        icon: z
          .string()
          .nullable()
          .optional()
          .describe(
            "An icon for the document, e.g. an emoji. Set to null to remove."
          ),
        color: z
          .string()
          .nullable()
          .optional()
          .describe(
            "The hex color for the document icon. Set to null to remove."
          ),
      },
    },
    async (input, context) => {
      try {
        const ctx = buildAPIContext(context);
        const { user } = ctx.state.auth;

        const document = await Document.findByPk(input.id, {
          userId: user.id,
          includeState: true,
          rejectOnEmpty: true,
        });

        authorize(user, "update", document);

        const updated = await documentUpdater(ctx, {
          document,
          ...input,
        });

        const { text, ...attributes } = await presentDocument(
          undefined,
          updated,
          {
            includeData: false,
            includeText: true,
            includeUpdatedAt: true,
          }
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(attributes),
            },
            {
              type: "text" as const,
              text: String(text ?? ""),
            },
          ],
        } satisfies CallToolResult;
      } catch (message) {
        return error(message);
      }
    }
  );
}
