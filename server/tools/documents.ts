import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import documentCreator from "@server/commands/documentCreator";
import documentMover from "@server/commands/documentMover";
import documentUpdater from "@server/commands/documentUpdater";
import { Op } from "sequelize";
import { Collection, Document } from "@server/models";
import { sequelize } from "@server/storage/database";
import { authorize } from "@server/policies";
import { presentDocument, presentNavigationNode } from "@server/presenters";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import { UrlHelper } from "@shared/utils/UrlHelper";
import {
  error,
  success,
  buildAPIContext,
  buildSiblingIndexMap,
  getActorFromContext,
  getBreadcrumbsForDocuments,
  getDocumentBreadcrumb,
  pathToUrl,
  withTracing,
} from "./util";
import { TextEditMode } from "@shared/types";
import SearchProviderManager from "@server/utils/SearchProviderManager";

/**
 * Registers document-related MCP tools on the given server, filtered by
 * the OAuth scopes granted to the current token.
 *
 * @param server - the MCP server instance to register on.
 * @param scopes - the OAuth scopes granted to the access token.
 */
export function documentTools(server: McpServer, scopes: string[]) {
  if (AuthenticationHelper.canAccess("documents.list", scopes)) {
    server.registerTool(
      "list_documents",
      {
        title: "Search documents",
        description:
          "Searches documents the user has access to. Performs full-text search across document content when a query is provided, or lists recent documents when no query is given. Optionally filter by collection. To retrieve the full contents or hierarchy of a specific collection, use list_collection_documents instead.",
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
        "list_documents",
        async ({ query, collectionId, offset, limit }, extra) => {
          try {
            const user = getActorFromContext(extra);
            const effectiveOffset = offset ?? 0;
            const effectiveLimit = limit ?? 25;

            let indexMap: Map<string, number> | undefined;

            if (collectionId) {
              const collection = await Collection.findByPk(collectionId, {
                userId: user.id,
                includeDocumentStructure: true,
              });
              authorize(user, "readDocument", collection);

              if (collection?.documentStructure) {
                indexMap = buildSiblingIndexMap(collection.documentStructure);
              }
            }

            if (query) {
              const searchProvider = SearchProviderManager.getProvider();

              // If the query looks like a document ID or urlId, try direct
              // lookup first so exact matches appear at the top of results.
              let exactMatch: Document | null = null;
              if (UrlHelper.SLUG_URL_REGEX.test(query)) {
                exactMatch = await Document.findByPk(query, {
                  userId: user.id,
                });
                if (
                  exactMatch &&
                  collectionId &&
                  exactMatch.collectionId !== collectionId
                ) {
                  exactMatch = null;
                }
              }

              const { results } = await searchProvider.searchForUser(user, {
                query,
                collectionId,
                offset: effectiveOffset,
                limit: effectiveLimit,
              });

              const filteredResults = results.filter(
                (result) => result.document.id !== exactMatch?.id
              );
              const breadcrumbs = await getBreadcrumbsForDocuments(
                [
                  ...(exactMatch ? [exactMatch] : []),
                  ...filteredResults.map((r) => r.document),
                ],
                user
              );

              const presented = await Promise.all(
                filteredResults.map(async (result) => {
                  const doc = pathToUrl(
                    user.team,
                    await presentDocument(undefined, result.document, {
                      includeData: false,
                      includeText: false,
                    })
                  );
                  const breadcrumb = breadcrumbs.get(result.document.id);
                  const siblingIndex = indexMap?.get(result.document.id);
                  return {
                    document: doc,
                    ...(breadcrumb !== undefined && { breadcrumb }),
                    context: result.context,
                    ...(siblingIndex !== undefined && {
                      index: siblingIndex,
                    }),
                  };
                })
              );

              if (exactMatch) {
                const doc = pathToUrl(
                  user.team,
                  await presentDocument(undefined, exactMatch, {
                    includeData: false,
                    includeText: false,
                  })
                );
                const breadcrumb = breadcrumbs.get(exactMatch.id);
                const siblingIndex = indexMap?.get(exactMatch.id);
                presented.unshift({
                  document: doc,
                  ...(breadcrumb !== undefined && { breadcrumb }),
                  context: undefined,
                  ...(siblingIndex !== undefined && { index: siblingIndex }),
                });
              }

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

            const breadcrumbs = await getBreadcrumbsForDocuments(
              documents,
              user
            );

            const presented = await Promise.all(
              documents.map(async (document) => {
                const doc = pathToUrl(
                  user.team,
                  await presentDocument(undefined, document, {
                    includeData: false,
                    includeText: false,
                  })
                );
                const breadcrumb = breadcrumbs.get(document.id);
                const siblingIndex = indexMap?.get(document.id);
                return {
                  document: doc,
                  ...(breadcrumb !== undefined && { breadcrumb }),
                  ...(siblingIndex !== undefined && { index: siblingIndex }),
                };
              })
            );
            return success(presented);
          } catch (message) {
            return error(message);
          }
        }
      )
    );
  }

  if (AuthenticationHelper.canAccess("collections.documents", scopes)) {
    server.registerTool(
      "list_collection_documents",
      {
        title: "List all documents in a collection",
        description:
          "Returns the complete hierarchical tree of published documents in a collection, including nested sub-documents. Use this to enumerate every document in a collection or to understand parent/child relationships. Drafts and archived documents are not included.",
        annotations: {
          idempotentHint: true,
          readOnlyHint: true,
        },
        inputSchema: {
          collectionId: z
            .string()
            .describe(
              "The ID of the collection whose document tree to return."
            ),
        },
      },
      withTracing(
        "list_collection_documents",
        async ({ collectionId }, extra) => {
          try {
            const user = getActorFromContext(extra);

            const collection = await Collection.findByPk(collectionId, {
              userId: user.id,
              rejectOnEmpty: true,
            });
            authorize(user, "readDocument", collection);

            const documentStructure =
              await collection.getCachedDocumentStructure();

            const tree = (documentStructure ?? []).map((node) =>
              presentNavigationNode(user.team, node)
            );
            return success(tree);
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

          const [{ text, ...attributes }, breadcrumb] = await Promise.all([
            presentDocument(undefined, document, {
              includeData: false,
              includeText: true,
              includeUpdatedAt: true,
            }),
            getDocumentBreadcrumb(document, user),
          ]);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  document: pathToUrl(user.team, attributes),
                  ...(breadcrumb !== undefined && { breadcrumb }),
                }),
              },
              {
                type: "text" as const,
                text: typeof text === "string" ? text : "",
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
          "Moves a document to a different location or reorders it within its current parent. Provide a collectionId to move to the root of a collection, a parentDocumentId to nest under another document, and/or an index to control position among siblings.",
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
          index: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe(
              "The zero-based position to insert the document among its siblings. Use this to reorder documents within the same collection and parent. Omit to place at the end."
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

            const { documents, collections } = await documentMover(ctx, {
              document,
              collectionId: collectionId ?? null,
              parentDocumentId: input.parentDocumentId ?? null,
              index: input.index,
            });

            const indexMap = new Map<string, number>();
            for (const col of collections) {
              if (col.documentStructure) {
                for (const [id, idx] of buildSiblingIndexMap(
                  col.documentStructure
                )) {
                  indexMap.set(id, idx);
                }
              }
            }

            const breadcrumbs = await getBreadcrumbsForDocuments(
              documents,
              user
            );

            const presented = await Promise.all(
              documents.map(async (document) => {
                const doc = pathToUrl(
                  user.team,
                  await presentDocument(undefined, document, {
                    includeData: false,
                    includeText: false,
                  })
                );
                const breadcrumb = breadcrumbs.get(document.id);
                const siblingIndex = indexMap.get(document.id);
                return {
                  document: doc,
                  ...(breadcrumb !== undefined && { breadcrumb }),
                  ...(siblingIndex !== undefined && { index: siblingIndex }),
                };
              })
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
          'Updates an existing document by its ID. Only the fields provided will be updated. IMPORTANT: When editing an existing document\'s content, always prefer editMode "patch" with findText and text — this surgically replaces only the matched section and preserves all rich formatting (highlights, comments, table widths, etc) in the rest of the document. Using "replace" will overwrite the entire document and lose any formatting that cannot be represented in markdown.',
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
            .describe(
              'The markdown content to apply. In "replace" mode this becomes the entire document. In "append"/"prepend" mode it is added to the end/beginning. In "patch" mode this is the replacement text for the matched findText.'
            ),
          editMode: z
            .enum(TextEditMode)
            .optional()
            .describe(
              'How to apply the text update. "replace" (default) replaces the entire document content. "append" adds text to the end. "prepend" adds text to the beginning. "patch" finds the exact markdown specified in findText and replaces only that portion, preserving the rest of the document including any rich formatting that cannot be represented in markdown.'
            ),
          findText: z
            .string()
            .optional()
            .describe(
              'Required when editMode is "patch". The exact markdown substring to find in the document. This should be copied verbatim from the document\'s existing markdown content. The first occurrence will be replaced with the text parameter. Can span multiple blocks (paragraphs, headings, etc).'
            ),
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

          const [{ text, ...attributes }, breadcrumb] = await Promise.all([
            presentDocument(undefined, updated, {
              includeData: false,
              includeText: true,
              includeUpdatedAt: true,
            }),
            getDocumentBreadcrumb(updated, user),
          ]);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  document: pathToUrl(user.team, attributes),
                  ...(breadcrumb !== undefined && { breadcrumb }),
                }),
              },
              {
                type: "text" as const,
                text: typeof text === "string" ? text : "",
              },
            ],
          } satisfies CallToolResult;
        } catch (message) {
          return error(message);
        }
      })
    );
  }

  if (AuthenticationHelper.canAccess("documents.delete", scopes)) {
    server.registerTool(
      "delete_document",
      {
        title: "Delete document",
        description:
          "Deletes a document by its ID. The document is moved to the trash and can be restored later. Set archive to true to archive the document instead of deleting it.",
        annotations: {
          idempotentHint: false,
          readOnlyHint: false,
        },
        inputSchema: {
          id: z
            .string()
            .describe("The unique identifier of the document to delete."),
          archive: z
            .boolean()
            .optional()
            .describe(
              "Set to true to archive the document instead of deleting it. Archived documents remain searchable in the archive view."
            ),
        },
      },
      withTracing("delete_document", async ({ id, archive }, context) => {
        try {
          const ctx = buildAPIContext(context);
          const { user } = ctx.state.auth;

          await sequelize.transaction(async (transaction) => {
            ctx.state.transaction = transaction;
            ctx.context.transaction = transaction;

            const document = await Document.findByPk(id, {
              userId: user.id,
              rejectOnEmpty: true,
              transaction,
            });

            if (archive) {
              authorize(user, "archive", document);
              await document.archiveWithCtx(ctx);
            } else {
              authorize(user, "delete", document);
              await document.destroyWithCtx(ctx);
            }
          });

          return success({ success: true });
        } catch (message) {
          return error(message);
        }
      })
    );
  }
}
