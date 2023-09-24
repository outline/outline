import JWT from "jsonwebtoken";
import Router from "koa-router";
import mime from "mime-types";
import env from "@server/env";
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from "@server/errors";
import auth from "@server/middlewares/authentication";
import multipart from "@server/middlewares/multipart";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { Attachment } from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { authorize } from "@server/policies";
import FileStorage from "@server/storage/files";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { getJWTPayload } from "@server/utils/jwt";
import { createRootDirForLocalStorage } from "../utils";
import * as T from "./schema";

createRootDirForLocalStorage();

const router = new Router();

router.post(
  "files.create",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth(),
  validate(T.FilesCreateSchema),
  multipart({ maximumFileSize: env.FILE_STORAGE_UPLOAD_MAX_SIZE }),
  async (ctx: APIContext<T.FilesCreateReq>) => {
    const actor = ctx.state.auth.user;
    const { key } = ctx.input.body;
    const file = ctx.input.file;

    const attachment = await Attachment.findOne({
      where: { key },
      rejectOnEmpty: true,
    });

    if (attachment.userId !== actor.id) {
      throw AuthorizationError("Invalid key");
    }

    await attachment.writeFile(file);

    ctx.body = {
      success: true,
    };
  }
);

router.get(
  "files.get",
  auth({ optional: true }),
  validate(T.FilesGetSchema),
  async (ctx: APIContext<T.FilesGetReq>) => {
    const actor = ctx.state.auth.user;
    const key = getKeyFromContext(ctx);
    const isSignedRequest = !!ctx.input.query.sig;
    const { isPublicBucket, fileName } = AttachmentHelper.parseKey(key);
    const skipAuthorize = isPublicBucket || isSignedRequest;
    const cacheHeader = "max-age=604800, immutable";

    if (skipAuthorize) {
      ctx.set("Cache-Control", cacheHeader);
      ctx.set(
        "Content-Type",
        (fileName ? mime.lookup(fileName) : undefined) ||
          "application/octet-stream"
      );
      ctx.attachment(fileName);
      ctx.body = FileStorage.getFileStream(key);
    } else {
      const attachment = await Attachment.findOne({
        where: { key },
        rejectOnEmpty: true,
      });
      authorize(actor, "read", attachment);

      ctx.set("Cache-Control", cacheHeader);
      ctx.set("Content-Type", attachment.contentType);
      ctx.attachment(attachment.name);
      ctx.body = attachment.stream;
    }
  }
);

function getKeyFromContext(ctx: APIContext<T.FilesGetReq>): string {
  const { key, sig } = ctx.input.query;
  if (sig) {
    const payload = getJWTPayload(sig);

    if (payload.type !== "attachment") {
      throw AuthenticationError("Invalid signature");
    }

    try {
      JWT.verify(sig, env.SECRET_KEY);
    } catch (err) {
      throw AuthenticationError("Invalid signature");
    }

    return payload.key as string;
  }

  if (key) {
    return key;
  }

  throw ValidationError("Must provide either key or sig parameter");
}

export default router;
