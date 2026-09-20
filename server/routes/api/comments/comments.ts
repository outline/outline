import Router from "koa-router";
import type { Next } from "koa";
import { difference } from "es-toolkit/compat";
import type { FindOptions, WhereOptions } from "sequelize";
import { Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import {
  CommentStatusFilter,
  MentionType,
  IconType,
  CommentingAccess,
  TeamPreference,
} from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import { commentParser } from "@server/editor";
import auth from "@server/middlewares/authentication";
import { commentingEnabled } from "@server/middlewares/feature";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { AuthenticationError, ValidationError } from "@server/errors";
import { Document, Comment, Collection, Reaction, Emoji } from "@server/models";
import type { Share } from "@server/models";
import { loadPublicShare } from "@server/commands/shareLoader";
import shareSubscriptionCreator from "@server/commands/shareSubscriptionCreator";
import { createContext } from "@server/context";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { TextHelper } from "@server/models/helpers/TextHelper";
import { authorize } from "@server/policies";
import { presentComment, presentPolicies } from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { getTeamFromContext } from "@server/utils/passport";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

/** Preserves authenticated comment access unless a public share is supplied. */
async function commentAccess(ctx: APIContext, next: Next) {
  if (ctx.request.body?.shareId) {
    return next();
  }
  if (!ctx.state.auth.user) {
    throw AuthenticationError("Authentication required");
  }
  return commentingEnabled()(ctx, next);
}

/**
 * Loads the public share a comment request refers to and verifies that it
 * permits public commenting, both on the share itself and on the owning
 * team's commenting preference.
 *
 * @param ctx the request context.
 * @param shareId the id of the share to load.
 * @param documentId the id of the document the share must resolve to.
 * @returns the loaded share.
 * @throws {ValidationError} if public comments are disabled for the share or
 *   commenting is disabled for the team.
 */
async function loadShareForPublicComments(
  ctx: APIContext,
  shareId: string,
  documentId: string
): Promise<Share> {
  const teamFromCtx = await getTeamFromContext(ctx, {
    includeOAuthState: false,
  });
  const { share } = await loadPublicShare({
    id: shareId,
    documentId,
    teamId: teamFromCtx?.id,
  });
  if (!share.allowPublicComments) {
    throw ValidationError("Public comments are disabled for this share");
  }
  const commenting = share.team.getPreference(TeamPreference.Commenting);
  if (commenting === CommentingAccess.None || commenting === false) {
    throw ValidationError("Commenting is currently disabled");
  }
  return share;
}

router.post(
  "comments.create",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth({ optional: true }),
  commentAccess,
  validate(T.CommentsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsCreateReq>) => {
    const {
      id,
      documentId,
      parentCommentId,
      anchorText,
      anchorPrefix,
      anchorSuffix,
      anchorNodeId,
      shareId,
      guestName,
      guestEmail,
      isPublic,
    } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const anchored = !!(anchorText || anchorNodeId);

    let share: Share | undefined;

    if (shareId) {
      share = await loadShareForPublicComments(ctx, shareId, documentId);
      if (!guestName) {
        throw ValidationError("A name is required to post a public comment");
      }
    } else {
      if (!user) {
        throw AuthenticationError("Authentication is required");
      }
      const commenting = user.team.getPreference(TeamPreference.Commenting);
      if (commenting === CommentingAccess.None || commenting === false) {
        throw ValidationError("Commenting is currently disabled");
      }
    }

    if (parentCommentId && anchored) {
      throw ValidationError("Replies cannot create a new comment anchor");
    }

    if (anchored) {
      // Acquire the row lock on the document directly when anchoring so a
      // concurrent inline comment can't overwrite our state update.
      await Document.unscoped().findOne({
        where: { id: documentId },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    }

    const document = await Document.findByPk(documentId, {
      userId: shareId ? undefined : user?.id,
      transaction,
      includeState: anchored,
      rejectOnEmpty: !!shareId,
    });
    if (!shareId) {
      authorize(user, "comment", document);
    }

    const text =
      ctx.input.body.text && !shareId && user
        ? await TextHelper.replaceImagesWithAttachments(
            ctx,
            ctx.input.body.text,
            user
          )
        : ctx.input.body.text;
    const data = text
      ? commentParser.parse(text).toJSON()
      : ctx.input.body.data;

    // The comment schema still includes the mention node — only the client
    // menu that inserts one was removed — so anonymous input must be walked
    // and rejected explicitly rather than relying on the editor UI.
    if (
      shareId &&
      data &&
      ProsemirrorHelper.parseMentions(ProsemirrorHelper.toProsemirror(data))
        .length > 0
    ) {
      throw ValidationError("Public comments cannot contain mentions");
    }

    const commentId = id || uuidv4();

    if (anchored) {
      const docState = DocumentHelper.toState(document);

      const updated = anchorText
        ? ProsemirrorHelper.applyCommentMarkByText({
            docState,
            anchorText,
            commentId,
            userId: user?.id ?? "public",
            prefix: anchorPrefix,
            suffix: anchorSuffix,
          })
        : anchorNodeId
          ? ProsemirrorHelper.applyCommentMarkByNode({
              docState,
              anchorNodeId,
              commentId,
              userId: user?.id ?? "public",
            })
          : null;

      if (!updated) {
        throw ValidationError(
          "Could not anchor comment to the provided location in the document"
        );
      }

      // Save with hooks enabled so the AfterUpdate hook notifies the
      // collaboration server, but silently so the document is not marked
      // as updated by adding a comment.
      await document.update(
        { state: updated.state, content: updated.content },
        { ...ctx.context, transaction, silent: true }
      );
    }

    const parentComment = parentCommentId
      ? await Comment.findOne({
          where: {
            id: parentCommentId,
            documentId,
            ...(shareId ? { isPublic: true } : {}),
          },
          transaction,
        })
      : null;
    if (parentCommentId && !parentComment) {
      throw ValidationError("Parent comment must belong to the same document");
    }
    if (parentComment?.parentCommentId) {
      throw ValidationError("Replies must target the root comment");
    }

    // A guest reply is always public. A member reply follows the parent's
    // visibility: always internal within an internal thread, and public or
    // internal (defaulting to public) within a public thread. A new root
    // comment keeps the existing behaviour of the member explicitly
    // choosing its visibility.
    let publicVisibility: boolean;
    if (shareId) {
      publicVisibility = true;
    } else if (parentComment) {
      publicVisibility = parentComment.isPublic ? (isPublic ?? true) : false;
    } else {
      publicVisibility = !!isPublic;
    }

    const actor = shareId ? undefined : user;
    // The guest email is only ever honoured on the public path, and only
    // when outgoing email is configured — it must never be stored or acted
    // on otherwise.
    const honourGuestEmail = !!shareId && env.EMAIL_ENABLED;
    const trimmedGuestEmail =
      !actor && honourGuestEmail ? guestEmail?.trim() : undefined;
    const attributes = {
      id: commentId,
      data,
      ...(actor ? { createdById: actor.id } : {}),
      guestName: actor ? null : guestName?.trim(),
      guestEmail: trimmedGuestEmail ?? null,
      isPublic: publicVisibility,
      documentId,
      parentCommentId,
    };
    const comment = await Comment.createWithCtx(
      actor ? ctx : createContext({ ip: ctx.ip, transaction }),
      attributes
    );
    comment.document = document;

    if (actor) {
      comment.createdBy = actor;
    }

    if (trimmedGuestEmail && share) {
      try {
        await shareSubscriptionCreator({
          share,
          documentId,
          email: trimmedGuestEmail,
          ip: ctx.ip,
          reason: "comments",
          transaction,
        });
      } catch (err) {
        // The subscription is a best-effort extra on top of the comment – a
        // visitor behind a shared address that has exhausted the per-IP
        // subscription limit must still be able to post the comment itself.
        if (
          !(err instanceof Error) ||
          !("id" in err) ||
          err.id !== "validation_error"
        ) {
          throw err;
        }
        Logger.info(
          "commands",
          `Skipping guest comment subscription for ${comment.id}: ${err.message}`
        );
      }
    }

    ctx.body = {
      data: presentComment(comment, { isPublic: !!shareId }),
      policies: actor ? presentPolicies(actor, [comment]) : undefined,
    };
  }
);

router.post(
  "comments.info",
  auth(),
  commentingEnabled(),
  validate(T.CommentsInfoSchema),
  async (ctx: APIContext<T.CommentsInfoReq>) => {
    const { id, includeAnchorText } = ctx.input.body;
    const { user } = ctx.state.auth;

    const comment = await Comment.findByPk(id, {
      rejectOnEmpty: true,
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
    });
    comment.document = document;

    authorize(user, "read", comment);
    authorize(user, "read", document);

    ctx.body = {
      data: presentComment(comment, { includeAnchorText }),
      policies: presentPolicies(user, [comment]),
    };
  }
);

router.post(
  "comments.list",
  auth({ optional: true }),
  commentAccess,
  pagination(),
  validate(T.CommentsListSchema),
  async (ctx: APIContext<T.CommentsListReq>) => {
    const {
      sort,
      direction,
      documentId,
      parentCommentId,
      statusFilter,
      collectionId,
      includeAnchorText,
      shareId,
    } = ctx.input.body;
    const { user } = ctx.state.auth;
    const statusQuery = [];

    if (statusFilter?.includes(CommentStatusFilter.Resolved)) {
      statusQuery.push({ resolvedById: { [Op.not]: null } });
    }
    if (statusFilter?.includes(CommentStatusFilter.Unresolved)) {
      statusQuery.push({ resolvedById: null });
    }

    const where: WhereOptions<Comment> = {
      [Op.and]: [],
    };
    if (documentId) {
      // @ts-expect-error ignore
      where[Op.and].push({ documentId });
    }
    if (parentCommentId) {
      // @ts-expect-error ignore
      where[Op.and].push({ parentCommentId });
    }
    if (statusQuery.length) {
      // @ts-expect-error ignore
      where[Op.and].push({ [Op.or]: statusQuery });
    }

    const params: FindOptions<Comment> = {
      where,
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    };

    if (shareId) {
      if (!documentId) {
        throw ValidationError("documentId is required for public comments");
      }
      await loadShareForPublicComments(ctx, shareId, documentId);
      // @ts-expect-error Sequelize symbol-based where shape
      where[Op.and].push({ isPublic: true });
      const document = await Document.findByPk(documentId, {
        includeContent: !!includeAnchorText,
        rejectOnEmpty: true,
      });
      const [comments, total] = await Promise.all([
        Comment.findAll(params),
        Comment.count({ where }),
      ]);
      comments.forEach((comment) => (comment.document = document));
      ctx.body = {
        pagination: { ...ctx.state.pagination, total },
        data: comments.map((comment) =>
          presentComment(comment, { includeAnchorText, isPublic: true })
        ),
      };
      return;
    }

    if (!user) {
      throw AuthenticationError("Authentication is required");
    }

    let comments, total;
    if (documentId) {
      const document = await Document.findByPk(documentId, {
        userId: user.id,
        // The body is only needed to resolve anchor text for each comment.
        includeContent: !!includeAnchorText,
      });
      authorize(user, "read", document);
      [comments, total] = await Promise.all([
        Comment.findAll(params),
        Comment.count({ where }),
      ]);
      comments.forEach((comment) => (comment.document = document));
    } else if (collectionId) {
      const collection = await Collection.findByPk(collectionId, {
        userId: user.id,
      });
      authorize(user, "read", collection);
      const include = [
        {
          model: Document,
          required: true,
          where: {
            teamId: user.teamId,
            collectionId,
          },
        },
      ];
      [comments, total] = await Promise.all([
        Comment.findAll({
          include,
          ...params,
        }),
        Comment.count({
          include,
          where,
        }),
      ]);
    } else {
      const accessibleCollectionIds = await user.collectionIds();
      const include = [
        {
          model: Document,
          required: true,
          where: {
            teamId: user.teamId,
            collectionId: { [Op.in]: accessibleCollectionIds },
          },
        },
      ];
      [comments, total] = await Promise.all([
        Comment.findAll({
          include,
          ...params,
        }),
        Comment.count({
          include,
          where,
        }),
      ]);
    }

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: comments.map((comment) =>
        presentComment(comment, { includeAnchorText })
      ),
      policies: presentPolicies(user, comments),
    };
  }
);

router.post(
  "comments.update",
  auth(),
  commentingEnabled(),
  validate(T.CommentsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsUpdateReq>) => {
    const { id, data } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
      transaction,
    });
    comment.document = document;

    authorize(user, "update", comment);
    authorize(user, "comment", document);

    let newMentionIds: string[] = [];

    if (data !== undefined) {
      const existingMentionIds = ProsemirrorHelper.parseMentions(
        ProsemirrorHelper.toProsemirror(comment.data),
        { type: MentionType.User }
      ).map((mention) => mention.id);
      const updatedMentionIds = ProsemirrorHelper.parseMentions(
        ProsemirrorHelper.toProsemirror(data),
        { type: MentionType.User }
      ).map((mention) => mention.id);

      const existingGroupMentionIds = ProsemirrorHelper.parseMentions(
        ProsemirrorHelper.toProsemirror(comment.data),
        { type: MentionType.Group }
      ).map((mention) => mention.id);
      const updatedGroupMentionIds = ProsemirrorHelper.parseMentions(
        ProsemirrorHelper.toProsemirror(data),
        { type: MentionType.Group }
      ).map((mention) => mention.id);

      newMentionIds = [
        ...difference(updatedMentionIds, existingMentionIds),
        ...difference(updatedGroupMentionIds, existingGroupMentionIds),
      ];

      comment.data = data;
    }

    await comment.saveWithCtx(ctx, undefined, { data: { newMentionIds } });

    ctx.body = {
      data: presentComment(comment),
      policies: presentPolicies(user, [comment]),
    };
  }
);

router.post(
  "comments.delete",
  auth(),
  commentingEnabled(),
  validate(T.CommentsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
    });
    comment.document = document;

    authorize(user, "delete", comment);
    authorize(user, "comment", document);

    await comment.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "comments.resolve",
  auth(),
  commentingEnabled(),
  validate(T.CommentsResolveSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsResolveReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
    });
    comment.document = document;

    authorize(user, "resolve", comment);
    authorize(user, "update", document);

    comment.resolve(user);
    await comment.saveWithCtx(ctx, { silent: true });

    ctx.body = {
      data: presentComment(comment),
      policies: presentPolicies(user, [comment]),
    };
  }
);

router.post(
  "comments.unresolve",
  auth(),
  commentingEnabled(),
  validate(T.CommentsUnresolveSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsUnresolveReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
    });
    comment.document = document;

    authorize(user, "unresolve", comment);
    authorize(user, "update", document);

    comment.unresolve();
    await comment.saveWithCtx(ctx, { silent: true });

    ctx.body = {
      data: presentComment(comment),
      policies: presentPolicies(user, [comment]),
    };
  }
);

router.post(
  "comments.add_reaction",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  commentingEnabled(),
  validate(T.CommentsReactionSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsReactionReq>) => {
    const { id, emoji } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
      transaction,
    });
    comment.document = document;

    authorize(user, "comment", document);
    authorize(user, "addReaction", comment);

    if (determineIconType(emoji) === IconType.Custom) {
      const customEmoji = await Emoji.findByPk(emoji, {
        transaction,
      });
      authorize(user, "read", customEmoji);
    }

    await Reaction.findOrCreateWithCtx(
      ctx,
      {
        where: {
          emoji,
          userId: user.id,
          commentId: id,
        },
      },
      {
        persist: false,
      }
    );

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "comments.remove_reaction",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  commentingEnabled(),
  validate(T.CommentsReactionSchema),
  transaction(),
  async (ctx: APIContext<T.CommentsReactionReq>) => {
    const { id, emoji } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const comment = await Comment.findByPk(id, {
      transaction,
      rejectOnEmpty: true,
      lock: {
        level: transaction.LOCK.UPDATE,
        of: Comment,
      },
    });
    const document = await Document.findByPk(comment.documentId, {
      userId: user.id,
      transaction,
    });
    comment.document = document;

    authorize(user, "comment", document);
    authorize(user, "removeReaction", comment);

    const reaction = await Reaction.findOne({
      where: { emoji, userId: user.id, commentId: id },
      transaction,
    });
    authorize(user, "delete", reaction);

    await reaction.destroy(ctx.context);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
