import Router from "koa-router";
import { v4 as uuidv4 } from "uuid";
import { AttachmentPreset } from "@shared/types";
import { bytesToHumanReadable } from "@shared/utils/files";
import { AttachmentValidation } from "@shared/validations";
import { AuthorizationError, ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import {
  transaction,
  TransactionContext,
} from "@server/middlewares/transaction";
import { Attachment, Document, Event } from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { authorize } from "@server/policies";
import { presentAttachment } from "@server/presenters";
import { ContextWithState } from "@server/types";
import { getPresignedPost, publicS3Endpoint } from "@server/utils/s3";
import { assertIn, assertPresent, assertUuid } from "@server/validation";

const router = new Router();

router.post(
  "attachments.create",
  auth(),
  transaction(),
  async (ctx: TransactionContext) => {
    const {
      name,
      documentId,
      contentType = "application/octet-stream",
      size,
      // 'public' is now deprecated and can be removed on December 1 2022.
      public: isPublicDeprecated,
      preset = isPublicDeprecated
        ? AttachmentPreset.Avatar
        : AttachmentPreset.DocumentAttachment,
    } = ctx.request.body;
    const { user, transaction } = ctx.state;

    assertPresent(name, "name is required");
    assertPresent(size, "size is required");

    // Public attachments are only used for avatars, so this is loosely coupled –
    // all user types can upload an avatar so no additional authorization is needed.
    if (preset === AttachmentPreset.Avatar) {
      assertIn(contentType, AttachmentValidation.avatarContentTypes);
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

    if (documentId !== undefined) {
      assertUuid(documentId, "documentId must be a uuid");
      const document = await Document.findByPk(documentId, {
        userId: user.id,
      });
      authorize(user, "update", document);
    }

    const modelId = uuidv4();
    const acl = AttachmentHelper.presetToAcl(preset);
    const key = AttachmentHelper.getKey({
      acl,
      id: modelId,
      name,
      userId: user.id,
    });

    const attachment = await Attachment.create(
      {
        id: modelId,
        key,
        acl,
        size,
        expiresAt: AttachmentHelper.presetToExpiry(preset),
        contentType,
        documentId,
        teamId: user.teamId,
        userId: user.id,
      },
      { transaction }
    );
    await Event.create(
      {
        name: "attachments.create",
        data: {
          name,
        },
        modelId,
        teamId: user.teamId,
        actorId: user.id,
        ip: ctx.request.ip,
      },
      { transaction }
    );

    const presignedPost = await getPresignedPost(
      key,
      acl,
      maxUploadSize,
      contentType
    );

    ctx.body = {
      data: {
        uploadUrl: publicS3Endpoint(),
        form: {
          "Cache-Control": "max-age=31557600",
          "Content-Type": contentType,
          ...presignedPost.fields,
        },
        attachment: presentAttachment(attachment),
      },
    };
  }
);

router.post("attachments.delete", auth(), async (ctx) => {
  const { id } = ctx.request.body;
  assertUuid(id, "id is required");
  const { user } = ctx.state;
  const attachment = await Attachment.findByPk(id, {
    rejectOnEmpty: true,
  });

  if (attachment.documentId) {
    const document = await Document.findByPk(attachment.documentId, {
      userId: user.id,
    });
    authorize(user, "update", document);
  }

  authorize(user, "delete", attachment);
  await attachment.destroy();
  await Event.create({
    name: "attachments.delete",
    teamId: user.teamId,
    actorId: user.id,
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

const handleAttachmentsRedirect = async (ctx: ContextWithState) => {
  const id = ctx.request.body?.id ?? ctx.request.query?.id;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const attachment = await Attachment.findByPk(id, {
    rejectOnEmpty: true,
  });

  if (attachment.isPrivate && attachment.teamId !== user.teamId) {
    throw AuthorizationError();
  }

  await attachment.update({
    lastAccessedAt: new Date(),
  });

  if (attachment.isPrivate) {
    ctx.redirect(await attachment.signedUrl);
  } else {
    ctx.redirect(attachment.canonicalUrl);
  }
};

router.get("attachments.redirect", auth(), handleAttachmentsRedirect);
router.post("attachments.redirect", auth(), handleAttachmentsRedirect);

export default router;
