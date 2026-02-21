import { z } from "zod";
import {
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  type CallToolResult,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import documentCreator from "@server/commands/documentCreator";
import documentMover from "@server/commands/documentMover";
import documentUpdater from "@server/commands/documentUpdater";
import { Op } from "sequelize";
import { Collection, Document } from "@server/models";
import { sequelize } from "@server/storage/database";
import SearchHelper from "@server/models/helpers/SearchHelper";
import { authorize } from "@server/policies";
import { presentDocument } from "@server/presenters";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import {
  error,
  success,
  buildAPIContext,
  getActorFromContext,
  pathToUrl,
  withTracing,
} from "./util";
import { TextEditMode } from "@shared/types";

/**
 * Registers document-related MCP tools and resources on the given server,
 * filtered by the OAuth scopes granted to the current token.
 *
 * @param server - the MCP server instance to register on.
 * @param scopes - the OAuth scopes granted to the access token.
 */
export function documentTools(server: McpServer, scopes: string[]) {
  if (AuthenticationHelper.canAccess("documents.info", scopes)) {
    server.registerResource(
      "get_document",
      new ResourceTemplate("outline://documents/{id}", { list: undefined }),
      {
        title: "Get document",
        description: "Fetches the content of a document by its ID.",
        mimeType: "text/markdown",
      },
      withTracing("get_document", async (uri, variables, extra) => {
        try {
          const { id } = variables;
          const user = getActorFromContext(extra);
          const document = await Document.findByPk(String(id), {
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
            contents: [
              {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(pathToUrl(user.team, attributes)),
              },
              {
                uri: uri.href,
                mimeType: "text/markdown",
                text: String(text ?? ""),
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

  if (AuthenticationHelper.canAccess("documents.list", scopes)) {
    server.registerTool(
      "list_documents",
      {
        title: "Search documents",
        description:
          "Searches documents the user has access to. Performs full-text search across document content when a query is provided, or lists recent documents when no query is given. Optionally filter by collection.",
        annotations: {
          idempotentHint: true,
          readOnlyHint: true,
        },
        inputSchema: {
          query: z
            .string()
            .optional()
            .describe(
              "A search query to find documents by content or title. When omitted, returns recent documents."
            ),
          collectionId: z
            .string()
            .optional()
            .describe("An optional collection ID to filter documents by."),
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
        "list_documents",
        async ({ query, collectionId, offset, limit }, extra) => {
          try {
            const user = getActorFromContext(extra);
            const effectiveOffset = offset ?? 0;
            const effectiveLimit = limit ?? 25;

            if (collectionId) {
              const collection = await Collection.findByPk(collectionId, {
                userId: user.id,
              });
              authorize(user, "readDocument", collection);
            }

            if (query) {
              const { results } = await SearchHelper.searchForUser(user, {
                query,
                collectionId,
                offset: effectiveOffset,
                limit: effectiveLimit,
              });

              const presented = await Promise.all(
                results.map(async (result) => {
                  const doc = pathToUrl(
                    user.team,
                    await presentDocument(undefined, result.document, {
                      includeData: false,
                      includeText: false,
                    })
                  );
                  return { ...doc, context: result.context };
                })
              );
              return success(presented);
            }

            const collectionIds = collectionId
              ? [collectionId]
              : await user.collectionIds();

            const documents = await Document.findAll({
              where: {
                teamId: user.teamId,
                collectionId: collectionIds,
                archivedAt: { [Op.eq]: null },
                deletedAt: { [Op.eq]: null },
              },
              order: [["updatedAt", "DESC"]],
              offset: effectiveOffset,
              limit: effectiveLimit,
            });

            const presented = await Promise.all(
              documents.map(async (document) =>
                pathToUrl(
                  user.team,
                  await presentDocument(undefined, document, {
                    includeData: false,
                    includeText: false,
                  })
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

  if (AuthenticationHelper.canAccess("documents.create", scopes)) {
    server.registerTool(
      "create_document",
      {
        title: "Create document",
        description:
          "Creates a new document. Requires a collectionId to place the document in a collection, or parentDocumentId to nest it under an existing document.",
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
          publish: z
            .boolean()
            .optional()
            .describe(
              "Whether to publish the document. Defaults to true. Set to false to create as a draft."
            ),
        },
      },
      withTracing("create_document", async (input, context) => {
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
            publish: input.publish !== false,
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
                text: JSON.stringify(pathToUrl(user.team, attributes)),
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
      })
    );
  }

  if (AuthenticationHelper.canAccess("documents.move", scopes)) {
    server.registerTool(
      "move_document",
      {
        title: "Move document",
        description:
          "Moves a document to a different collection or parent document. Provide either a collectionId to move to the root of a collection, or a parentDocumentId to nest under another document.",
        annotations: {
          idempotentHint: false,
          readOnlyHint: false,
        },
        inputSchema: {
          id: z
            .string()
            .describe("The unique identifier of the document to move."),
          collectionId: z
            .string()
            .optional()
            .describe(
              "The destination collection ID. Required if parentDocumentId is not provided."
            ),
          parentDocumentId: z
            .string()
            .optional()
            .describe(
              "The ID of the document to nest this document under. The document will be moved to the parent's collection."
            ),
        },
      },
      withTracing("move_document", async (input, context) => {
        try {
          const ctx = buildAPIContext(context);
          const { user } = ctx.state.auth;

          return await sequelize.transaction(async (transaction) => {
            ctx.state.transaction = transaction;
            ctx.context.transaction = transaction;

            const document = await Document.findByPk(input.id, {
              userId: user.id,
              rejectOnEmpty: true,
              transaction,
            });

            authorize(user, "move", document);

            let collectionId = input.collectionId;

            if (input.parentDocumentId) {
              if (input.parentDocumentId === input.id) {
                return error("Cannot nest a document inside itself");
              }

              const parent = await Document.findByPk(input.parentDocumentId, {
                userId: user.id,
                rejectOnEmpty: true,
                transaction,
              });

              authorize(user, "update", parent);
              collectionId = parent.collectionId!;

              if (!parent.publishedAt) {
                return error("Cannot move document inside a draft");
              }
            } else if (!collectionId) {
              return error(
                "Either collectionId or parentDocumentId is required"
              );
            } else {
              const collection = await Collection.findByPk(collectionId, {
                userId: user.id,
                rejectOnEmpty: true,
                transaction,
              });
              authorize(user, "updateDocument", collection);
            }

            const { documents } = await documentMover(ctx, {
              document,
              collectionId: collectionId ?? null,
              parentDocumentId: input.parentDocumentId ?? null,
            });

            const presented = await Promise.all(
              documents.map(async (doc) =>
                pathToUrl(
                  user.team,
                  await presentDocument(undefined, doc, {
                    includeData: false,
                    includeText: false,
                  })
                )
              )
            );
            return success(presented);
          });
        } catch (message) {
          return error(message);
        }
      })
    );
  }

  if (AuthenticationHelper.canAccess("documents.update", scopes)) {
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
          publish: z
            .boolean()
            .optional()
            .describe(
              "Set to true to publish a draft document, or false to convert a published document back to a draft."
            ),
        },
      },
      withTracing("update_document", async (input, context) => {
        try {
          const ctx = buildAPIContext(context);
          const { user } = ctx.state.auth;

          const document = await Document.findByPk(input.id, {
            userId: user.id,
            includeState: true,
            rejectOnEmpty: true,
          });

          let updated;

          if (input.publish === false) {
            authorize(user, "unpublish", document);

            updated = await document.unpublishWithCtx(ctx, {
              detach: false,
            });
          } else {
            authorize(user, "update", document);

            updated = await documentUpdater(ctx, {
              document,
              ...input,
            });
          }

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
                text: JSON.stringify(pathToUrl(user.team, attributes)),
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
      })
    );
  }
}
