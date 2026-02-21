import { z } from "zod";
import { Op } from "sequelize";
import type { FindOptions, WhereOptions } from "sequelize";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CommentStatusFilter } from "@shared/types";
import { commentParser } from "@server/editor";
import { Comment, Collection, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentComment } from "@server/presenters";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import {
  error,
  success,
  buildAPIContext,
  getActorFromContext,
  withTracing,
} from "./util";

/**
 * Presents a comment with a plain-text rendering of its content so that
 * MCP consumers (typically AI agents) can read it without parsing
 * ProseMirror JSON.
 *
 * @param comment - the comment model instance.
 * @returns the presented comment with an additional `text` field.
 */
function presentCommentWithText(comment: Comment) {
  const presented = presentComment(comment);
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
          documentId: z
            .string()
            .optional()
            .describe("The document ID to list comments for."),
          collectionId: z
            .string()
            .optional()
            .describe("The collection ID to list comments for."),
          parentCommentId: z
            .string()
            .optional()
            .describe("A parent comment ID to list only its replies."),
          statusFilter: z
            .array(z.enum(CommentStatusFilter))
            .optional()
            .describe(
              "Filter by resolution status: resolved, unresolved, or both."
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

            const presented = comments.map(presentCommentWithText);
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
          parentCommentId: z
            .string()
            .optional()
            .describe(
              "The parent comment ID to reply to. Omit for a top-level comment."
            ),
        },
      },
      withTracing(
        "create_comment",
        async ({ documentId, text, parentCommentId }, context) => {
          try {
            const ctx = buildAPIContext(context);
            const { user } = ctx.state.auth;

            const document = await Document.findByPk(documentId, {
              userId: user.id,
            });
            authorize(user, "comment", document);

            const data = commentParser.parse(text).toJSON();

            const comment = await Comment.createWithCtx(ctx, {
              data,
              createdById: user.id,
              documentId,
              parentCommentId,
            });

            comment.createdBy = user;

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
