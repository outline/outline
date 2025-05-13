import Router from "koa-router";
import { v4 as uuidv4 } from "uuid";
import { AttachmentPreset } from "@shared/types";
import { bytesToHumanReadable, getFileNameFromUrl } from "@shared/utils/files";
import { AttachmentValidation } from "@shared/validations";
import { createContext } from "@server/context";
import {
  AuthorizationError,
  InvalidRequestError,
  ValidationError,
} from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Attachment, Document } from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { authorize } from "@server/policies";
import { presentAttachment } from "@server/presenters";
import UploadAttachmentFromUrlTask from "@server/queues/tasks/UploadAttachmentFromUrlTask";
import { sequelize } from "@server/storage/database";
import FileStorage from "@server/storage/files";
import BaseStorage from "@server/storage/files/BaseStorage";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { assertIn } from "@server/validation";
import * as T from "./schema";

const router = new Router();

router.post(
  "attachments.create",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth(),
  validate(T.AttachmentsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.AttachmentCreateReq>) => {
    const { name, documentId, contentType, size, preset } = ctx.input.body;
    const { auth, transaction } = ctx.state;
    const { user } = auth;

    // All user types can upload an avatar so no additional authorization is needed.
    if (preset === AttachmentPreset.Avatar) {
      assertIn(contentType, AttachmentValidation.avatarContentTypes);
    } else if (preset === AttachmentPreset.DocumentAttachment && documentId) {
      const document = await Document.findByPk(documentId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "update", document);
    } else {
      authorize(user, "createAttachment", user.team);
    }

    const maxUploadSize = AttachmentHelper.presetToMaxUploadSize(preset);

    if (size > maxUploadSize) {
      throw ValidationError(
        `Sorry, this file is too large – the maximum size is ${bytesToHumanReadable(
          maxUploadSize
        )}`
      );
    }

    const modelId = uuidv4();
    const acl = AttachmentHelper.presetToAcl(preset);
    const key = AttachmentHelper.getKey({
      acl,
      id: modelId,
      name,
      userId: user.id,
    });

    const attachment = await Attachment.createWithCtx(ctx, {
      id: modelId,
      key,
      acl,
      size,
      expiresAt: AttachmentHelper.presetToExpiry(preset),
      contentType,
      documentId,
      teamId: user.teamId,
      userId: user.id,
    });

    const presignedPost = await FileStorage.getPresignedPost(
      key,
      acl,
      maxUploadSize,
      contentType
    );

    ctx.body = {
      data: {
        uploadUrl: FileStorage.getUploadUrl(),
        form: {
          "Cache-Control": "max-age=31557600",
          "Content-Type": contentType,
          ...presignedPost.fields,
        },
        attachment: {
          ...presentAttachment(attachment),
          // always use the redirect url for document attachments, as the serializer
          // depends on it to detect attachment vs link
          url:
            preset === AttachmentPreset.DocumentAttachment
              ? attachment.redirectUrl
              : attachment.url,
        },
      },
    };
  }
);

router.post(
  "attachments.createFromUrl",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.AttachmentsCreateFromUrlSchema),
  async (ctx: APIContext<T.AttachmentCreateFromUrlReq>) => {
    const { url, documentId, preset } = ctx.input.body;
    const { user, type } = ctx.state.auth;

    if (preset !== AttachmentPreset.DocumentAttachment || !documentId) {
      throw ValidationError(
        "Only document attachments can be created from a URL"
      );
    }

    const document = await Document.findByPk(documentId, {
      userId: user.id,
    });
    authorize(user, "update", document);

    const name = getFileNameFromUrl(url) ?? "file";
    const modelId = uuidv4();
    const acl = AttachmentHelper.presetToAcl(preset);
    const key = AttachmentHelper.getKey({
      acl,
      id: modelId,
      name,
      userId: user.id,
    });

    // Does not use transaction middleware, as attachment must be persisted
    // before the job is scheduled.
    const attachment = await sequelize.transaction(async (transaction) =>
      Attachment.createWithCtx(
        createContext({
          authType: type,
          user,
          ip: ctx.ip,
          transaction,
        }),
        {
          id: modelId,
          key,
          acl,
          size: 0,
          expiresAt: AttachmentHelper.presetToExpiry(preset),
          contentType: "application/octet-stream",
          documentId,
          teamId: user.teamId,
          userId: user.id,
        }
      )
    );

    const job = await new UploadAttachmentFromUrlTask().schedule({
      attachmentId: attachment.id,
      url,
    });

    const response = await job.finished();
    if ("error" in response) {
      throw InvalidRequestError(response.error);
    }

    await attachment.reload();

    ctx.body = {
      data: presentAttachment(attachment),
    };
  }
);

router.post(
  "attachments.delete",
  auth(),
  validate(T.AttachmentDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.AttachmentDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const attachment = await Attachment.findByPk(id, {
      rejectOnEmpty: true,
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (attachment.documentId) {
      const document = await Document.findByPk(attachment.documentId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "update", document);
    }

    authorize(user, "delete", attachment);
    await attachment.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

const handleAttachmentsRedirect = async (
  ctx: APIContext<T.AttachmentsRedirectReq>
) => {
  const id = (ctx.input.body.id ?? ctx.input.query.id) as string;

  const { user } = ctx.state.auth;
  const attachment = await Attachment.findByPk(id, {
    rejectOnEmpty: true,
  });

  if (attachment.isPrivate && attachment.teamId !== user.teamId) {
    throw AuthorizationError();
  }

  await attachment.update(
    {
      lastAccessedAt: new Date(),
    },
    {
      silent: true,
    }
  );

  if (attachment.isPrivate) {
    ctx.set(
      "Cache-Control",
      `max-age=${BaseStorage.defaultSignedUrlExpires}, immutable`
    );
    ctx.redirect(await attachment.signedUrl);
  } else {
    ctx.set("Cache-Control", `max-age=604800, immutable`);
    ctx.redirect(attachment.canonicalUrl);
  }
};

router.get(
  "attachments.redirect",
  auth(),
  validate(T.AttachmentsRedirectSchema),
  handleAttachmentsRedirect
);
router.post(
  "attachments.redirect",
  auth(),
  validate(T.AttachmentsRedirectSchema),
  handleAttachmentsRedirect
);

export default router;
