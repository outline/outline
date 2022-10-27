import Router from "koa-router";
import { v4 as uuidv4 } from "uuid";
import { bytesToHumanReadable } from "@shared/utils/files";
import { AttachmentValidation } from "@shared/validations";
import { sequelize } from "@server/database/sequelize";
import { AuthorizationError, ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { Attachment, Document, Event } from "@server/models";
import { authorize } from "@server/policies";
import { ContextWithState } from "@server/types";
import {
  getPresignedPost,
  publicS3Endpoint,
  getSignedUrl,
} from "@server/utils/s3";
import { assertIn, assertPresent, assertUuid } from "@server/validation";

const router = new Router();
const AWS_S3_ACL = process.env.AWS_S3_ACL || "private";

router.post("attachments.create", auth(), async (ctx) => {
  const {
    name,
    documentId,
    contentType = "application/octet-stream",
    size,
    public: isPublic,
  } = ctx.request.body;
  assertPresent(name, "name is required");
  assertPresent(size, "size is required");

  const { user } = ctx.state;

  // Public attachments are only used for avatars, so this is loosely coupled –
  // all user types can upload an avatar so no additional authorization is needed.
  if (isPublic) {
    assertIn(contentType, AttachmentValidation.avatarContentTypes);
  } else {
    authorize(user, "createAttachment", user.team);
  }

  if (
    process.env.AWS_S3_UPLOAD_MAX_SIZE &&
    size > process.env.AWS_S3_UPLOAD_MAX_SIZE
  ) {
    throw ValidationError(
      `Sorry, this file is too large – the maximum size is ${bytesToHumanReadable(
        parseInt(process.env.AWS_S3_UPLOAD_MAX_SIZE, 10)
      )}`
    );
  }

  const s3Key = uuidv4();
  const acl =
    isPublic === undefined ? AWS_S3_ACL : isPublic ? "public-read" : "private";
  const bucket = acl === "public-read" ? "public" : "uploads";
  const keyPrefix = `${bucket}/${user.id}/${s3Key}`;
  const key = `${keyPrefix}/${name}`;
  const presignedPost = await getPresignedPost(key, acl, contentType);
  const endpoint = publicS3Endpoint();
  const url = `${endpoint}/${keyPrefix}/${encodeURIComponent(name)}`;

  if (documentId !== undefined) {
    assertUuid(documentId, "documentId must be a uuid");
    const document = await Document.findByPk(documentId, {
      userId: user.id,
    });
    authorize(user, "update", document);
  }

  const attachment = await sequelize.transaction(async (transaction) => {
    const attachment = await Attachment.create(
      {
        key,
        acl,
        size,
        url,
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
        teamId: user.teamId,
        actorId: user.id,
        ip: ctx.request.ip,
      },
      { transaction }
    );

    return attachment;
  });

  ctx.body = {
    data: {
      maxUploadSize: process.env.AWS_S3_UPLOAD_MAX_SIZE,
      uploadUrl: endpoint,
      form: {
        "Cache-Control": "max-age=31557600",
        "Content-Type": contentType,
        ...presignedPost.fields,
      },
      attachment: {
        documentId,
        contentType,
        name,
        id: attachment.id,
        url: isPublic ? url : attachment.redirectUrl,
        size,
      },
    },
  };
});

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

  if (attachment.isPrivate) {
    if (attachment.teamId !== user.teamId) {
      throw AuthorizationError();
    }

    const accessUrl = await getSignedUrl(attachment.key);
    ctx.redirect(accessUrl);
  } else {
    ctx.redirect(attachment.canonicalUrl);
  }
};

router.get("attachments.redirect", auth(), handleAttachmentsRedirect);
router.post("attachments.redirect", auth(), handleAttachmentsRedirect);

export default router;
