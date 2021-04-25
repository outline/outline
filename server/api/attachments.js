// @flow
import format from "date-fns/format";
import Router from "koa-router";
import { v4 as uuidv4 } from "uuid";
import { NotFoundError } from "../errors";
import auth from "../middlewares/authentication";
import { Attachment, Document, Event } from "../models";
import policy from "../policies";
import {
  makePolicy,
  getSignature,
  publicS3Endpoint,
  makeCredential,
  getSignedImageUrl,
} from "../utils/s3";

const { authorize } = policy;
const router = new Router();
const AWS_S3_ACL = process.env.AWS_S3_ACL || "private";

router.post("attachments.create", auth(), async (ctx) => {
  let { name, documentId, contentType, size } = ctx.body;

  ctx.assertPresent(name, "name is required");
  ctx.assertPresent(contentType, "contentType is required");
  ctx.assertPresent(size, "size is required");

  const { user } = ctx.state;
  authorize(user, "createAttachment", user.team);

  const s3Key = uuidv4();
  const acl =
    ctx.body.public === undefined
      ? AWS_S3_ACL
      : ctx.body.public
      ? "public-read"
      : "private";

  const bucket = acl === "public-read" ? "public" : "uploads";
  const key = `${bucket}/${user.id}/${s3Key}/${name}`;
  const credential = makeCredential();
  const longDate = format(new Date(), "YYYYMMDDTHHmmss\\Z");
  const policy = makePolicy(credential, longDate, acl, contentType);
  const endpoint = publicS3Endpoint();
  const url = `${endpoint}/${key}`;

  if (documentId) {
    const document = await Document.findByPk(documentId, { userId: user.id });
    authorize(user, "update", document);
  }

  const attachment = await Attachment.create({
    key,
    acl,
    size,
    url,
    contentType,
    documentId,
    teamId: user.teamId,
    userId: user.id,
  });

  await Event.create({
    name: "attachments.create",
    data: { name },
    teamId: user.teamId,
    userId: user.id,
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: {
      maxUploadSize: process.env.AWS_S3_UPLOAD_MAX_SIZE,
      uploadUrl: endpoint,
      form: {
        "Cache-Control": "max-age=31557600",
        "Content-Type": contentType,
        acl,
        key,
        policy,
        "x-amz-algorithm": "AWS4-HMAC-SHA256",
        "x-amz-credential": credential,
        "x-amz-date": longDate,
        "x-amz-signature": getSignature(policy),
      },
      attachment: {
        documentId,
        contentType,
        name,
        id: attachment.id,
        url: attachment.redirectUrl,
        size,
      },
    },
  };
});

router.post("attachments.delete", auth(), async (ctx) => {
  let { id } = ctx.body;
  ctx.assertPresent(id, "id is required");

  const user = ctx.state.user;
  const attachment = await Attachment.findByPk(id);
  if (!attachment) {
    throw new NotFoundError();
  }

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
    userId: user.id,
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

router.post("attachments.redirect", auth(), async (ctx) => {
  const { id } = ctx.body;
  ctx.assertPresent(id, "id is required");

  const user = ctx.state.user;
  const attachment = await Attachment.findByPk(id);
  if (!attachment) {
    throw new NotFoundError();
  }

  if (attachment.isPrivate) {
    if (attachment.documentId) {
      const document = await Document.findByPk(attachment.documentId, {
        userId: user.id,
        paranoid: false,
      });
      authorize(user, "read", document);
    }

    const accessUrl = await getSignedImageUrl(attachment.key);
    ctx.redirect(accessUrl);
  } else {
    ctx.redirect(attachment.url);
  }
});

export default router;
