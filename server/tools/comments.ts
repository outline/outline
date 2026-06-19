import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { Op, Transaction } from "sequelize";
import type { FindOptions, WhereOptions } from "sequelize";
import { sequelize } from "@server/storage/database";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CommentStatusFilter } from "@shared/types";
import type { CommentMark } from "@shared/utils/ProsemirrorHelper";
import { commentParser } from "@server/editor";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { Comment, Collection, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentComment } from "@server/presenters";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import {
  error,
  success,
  buildAPIContext,
  getActorFromContext,
  optionalString,
  withTracing,
} from "./util";
import { ValidationError } from "@server/errors";

/**
 * Presents a comment with a plain-text rendering of its content so that
 * MCP consumers (typically AI agents) can read it without parsing
 * ProseMirror JSON.
 *
 * @param comment - the comment model instance.
 * @param commentMarks - optional precomputed comment marks to avoid reparsing.
 * @returns the presented comment with an additional `text` field.
 */
function presentCommentWithText(
  comment: Comment,
  commentMarks?: CommentMark[]
) {
  const presented = presentComment(comment, {
    includeAnchorText: true,
    commentMarks,
  });
  return {
    ...presented,
    text: comment.toPlainText(),
  };
}

/**
 * Registers comment-related MCP tools on the given server, filtered by the
 * OAuth scopes granted to the current token.
 *
 * @param server - the MCP server instance to register tools on.
 * @param scopes - the OAuth scopes granted to the access token.
 */
export function commentTools(server: McpServer, scopes: string[]) {
  if (AuthenticationHelper.canAccess("comments.list", scopes)) {
    server.registerTool(
      "list_comments",
      {
        title: "List comments",
        description:
          "Lists comments the user has access to. Requires at least one of documentId or collectionId. Optionally filter by parent comment or resolution status.",
        annotations: {
          idempotentHint: true,
          readOnlyHint: true,
        },
        inputSchema: {
          documentId: optionalString().describe(
            "The document ID to list comments for."
          ),
          collectionId: optionalString().describe(
            "The collection ID to list comments for."
          ),
          parentCommentId: optionalString().describe(
            "A parent comment ID to list only the replies in that thread."
          ),
          statusFilter: z
            .array(z.enum(CommentStatusFilter))
            .optional()
            .describe(
              "Filter by resolution status: resolved, unresolved, or both."
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
        "list_comments",
        async (
          {
            documentId,
            collectionId,
            parentCommentId,
            statusFilter,
            offset,
            limit,
          },
          extra
        ) => {
          try {
            const user = getActorFromContext(extra);
            const effectiveOffset = offset ?? 0;
            const effectiveLimit = limit ?? 25;

            const statusQuery: WhereOptions<Comment>[] = [];
            if (statusFilter?.includes(CommentStatusFilter.Resolved)) {
              statusQuery.push({ resolvedById: { [Op.not]: null } });
            }
            if (statusFilter?.includes(CommentStatusFilter.Unresolved)) {
              statusQuery.push({ resolvedById: null });
            }

            const and: WhereOptions<Comment>[] = [];
            if (documentId) {
              and.push({ documentId });
            }
            if (parentCommentId) {
              and.push({ parentCommentId });
            }
            if (statusQuery.length) {
              and.push({ [Op.or]: statusQuery });
            }
            const where: WhereOptions<Comment> = {
              [Op.and]: and,
            };

            const params: FindOptions<Comment> = {
              where,
              order: [["createdAt", "DESC"]],
              offset: effectiveOffset,
              limit: effectiveLimit,
            };

            let comments: Comment[];

            if (documentId) {
              const document = await Document.findByPk(documentId, {
                userId: user.id,
              });
              authorize(user, "read", document);

              comments = await Comment.findAll(params);
              comments.forEach((comment) => (comment.document = document!));
            } else if (collectionId) {
              const collection = await Collection.findByPk(collectionId, {
                userId: user.id,
              });
              authorize(user, "read", collection);

              comments = await Comment.findAll({
                include: [
                  {
                    model: Document,
                    required: true,
                    where: {
                      teamId: user.teamId,
                      collectionId,
                    },
                  },
                ],
                ...params,
              });
            } else {
              const accessibleCollectionIds = await user.collectionIds();

              comments = await Comment.findAll({
                include: [
                  {
                    model: Document,
                    required: true,
                    where: {
                      teamId: user.teamId,
                      collectionId: { [Op.in]: accessibleCollectionIds },
                    },
                  },
                ],
                ...params,
              });
            }

            // Precompute comment marks per document to avoid reparsing
            // the same document for every comment.
            const marksCache = new Map<string, CommentMark[]>();
            const presented = comments.map((comment) => {
              const doc = comment.document;
              let marks: CommentMark[] | undefined;
              if (doc) {
                if (!marksCache.has(doc.id)) {
                  marksCache.set(
                    doc.id,
                    ProsemirrorHelper.getComments(
                      DocumentHelper.toProsemirror(doc)
                    )
                  );
                }
                marks = marksCache.get(doc.id);
              }
              return presentCommentWithText(comment, marks);
            });
            return success(presented);
          } catch (err) {
            return error(err);
          }
        }
      )
    );
  }

  if (AuthenticationHelper.canAccess("comments.create", scopes)) {
    server.registerTool(
      "create_comment",
      {
        title: "Create comment",
        description:
          "Creates a new comment on a document. Provide the comment content as markdown text. Optionally nest it as a reply under an existing comment.",
        annotations: {
          idempotentHint: false,
          readOnlyHint: false,
        },
        inputSchema: {
          documentId: z.string().describe("The document ID to comment on."),
          text: z
            .string()
            .describe("The markdown text content of the comment."),
          parentCommentId: optionalString().describe(
            "The parent comment ID to reply to. Omit for a top-level comment."
          ),
          anchorText: optionalString().describe(
            "A plain text substring of the document to anchor this comment to as an inline comment. The first occurrence is used unless anchorPrefix or anchorSuffix is provided, omit for a general document comment."
          ),
          anchorPrefix: optionalString().describe(
            "Only provide this if anchorText appears more than once in the document and you need to target a specific occurrence. Plain text that immediately precedes anchorText."
          ),
          anchorSuffix: optionalString().describe(
            "Only provide this if anchorText appears more than once in the document and you need to target a specific occurrence. Plain text that immediately follows anchorText."
          ),
        },
      },
      withTracing(
        "create_comment",
        async (
          {
            documentId,
            text,
            parentCommentId,
            anchorText,
            anchorPrefix,
            anchorSuffix,
          },
          context
        ) => {
          try {
            const ctx = buildAPIContext(context);
            const { user } = ctx.state.auth;

            const data = commentParser.parse(text).toJSON();
            const commentId = uuidv4();

            const comment = await sequelize.transaction(async (transaction) => {
              ctx.state.transaction = transaction;
              ctx.context.transaction = transaction;

              if (anchorText) {
                // Acquire the row lock on the document directly when
                // anchoring so a concurrent comment-mark application can't
                // overwrite our state update.
                await Document.unscoped().findOne({
                  where: { id: documentId },
                  attributes: ["id"],
                  transaction,
                  lock: Transaction.LOCK.UPDATE,
                });
              }

              const document = await Document.findByPk(documentId, {
                userId: user.id,
                // We only need to load the state binary if applying a comment mark
                includeState: !!anchorText,
                transaction,
              });
              authorize(user, "comment", document);

              if (anchorText) {
                if (!document.state) {
                  throw ValidationError(
                    "Cannot inline comment on this document"
                  );
                }

                const updatedState = ProsemirrorHelper.applyCommentMarkByText({
                  docState: document.state,
                  anchorText,
                  commentId,
                  userId: user.id,
                  prefix: anchorPrefix,
                  suffix: anchorSuffix,
                });

                if (!updatedState) {
                  throw ValidationError(
                    "Could not anchor comment to the provided text in the document"
                  );
                }

                await document.updateWithCtx(ctx, { state: updatedState });
              }

              const created = await Comment.createWithCtx(ctx, {
                id: commentId,
                data,
                createdById: user.id,
                documentId,
                parentCommentId,
              });

              created.createdBy = user;
              created.document = document!;
              return created;
            });

            const presented = presentCommentWithText(comment);
            return {
              content: [
                { type: "text" as const, text: JSON.stringify(presented) },
              ],
            } satisfies CallToolResult;
          } catch (err) {
            return error(err);
          }
        }
      )
    );
  }

  if (AuthenticationHelper.canAccess("comments.update", scopes)) {
    server.registerTool(
      "update_comment",
      {
        title: "Update comment",
        description:
          "Updates an existing comment by its ID. Can update the text content, resolve or unresolve the comment thread, or both. Only top-level comments (not replies) can be resolved or unresolved.",
        annotations: {
          idempotentHint: true,
          readOnlyHint: false,
        },
        inputSchema: {
          id: z
            .string()
            .describe("The unique identifier of the comment to update."),
          text: z
            .string()
            .optional()
            .describe("The new markdown text content of the comment."),
          status: z
            .enum(["resolved", "unresolved"])
            .optional()
            .describe(
              "Set to 'resolved' to resolve or 'unresolved' to unresolve a top-level comment thread."
            ),
        },
      },
      withTracing("update_comment", async ({ id, text, status }, context) => {
        try {
          const ctx = buildAPIContext(context);
          const { user } = ctx.state.auth;

          const comment = await Comment.findByPk(id, {
            rejectOnEmpty: true,
          });
          const document = await Document.findByPk(comment.documentId, {
            userId: user.id,
          });

          authorize(user, "read", comment);
          authorize(user, "read", document);

          if (text !== undefined) {
            authorize(user, "update", comment);
            authorize(user, "comment", document);

            const data = commentParser.parse(text).toJSON();
            comment.data = data;
          }

          if (status === "resolved") {
            authorize(user, "resolve", comment);
            authorize(user, "update", document);
            comment.resolve(user);
          } else if (status === "unresolved") {
            authorize(user, "unresolve", comment);
            authorize(user, "update", document);
            comment.unresolve();
          }

          await comment.saveWithCtx(ctx, status ? { silent: true } : undefined);

          comment.document = document!;
          const presented = presentCommentWithText(comment);
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(presented) },
            ],
          } satisfies CallToolResult;
        } catch (err) {
          return error(err);
        }
      })
    );
  }

  if (AuthenticationHelper.canAccess("comments.delete", scopes)) {
    server.registerTool(
      "delete_comment",
      {
        title: "Delete comment",
        description:
          "Deletes a comment by its ID. The user must be the comment author or a team admin.",
        annotations: {
          idempotentHint: false,
          readOnlyHint: false,
        },
        inputSchema: {
          id: z
            .string()
            .describe("The unique identifier of the comment to delete."),
        },
      },
      withTracing("delete_comment", async ({ id }, context) => {
        try {
          const ctx = buildAPIContext(context);
          const { user } = ctx.state.auth;

          const comment = await Comment.findByPk(id, {
            rejectOnEmpty: true,
          });
          const document = await Document.findByPk(comment.documentId, {
            userId: user.id,
          });

          authorize(user, "delete", comment);
          authorize(user, "comment", document);

          await comment.destroyWithCtx(ctx);

          return success({ success: true });
        } catch (err) {
          return error(err);
        }
      })
    );
  }
}
