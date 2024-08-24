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
import LocalStorage from "@server/storage/files/LocalStorage";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { getJWTPayload } from "@server/utils/jwt";
import * as T from "./schema";

const router = new Router();

router.post(
  "files.create",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth(),
  validate(T.FilesCreateSchema),
  multipart({
    maximumFileSize: Math.max(
      env.FILE_STORAGE_UPLOAD_MAX_SIZE,
      env.FILE_STORAGE_IMPORT_MAX_SIZE
    ),
  }),
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

    try {
      await attachment.writeFile(file);
    } catch (err) {
      if (err.message.includes("permission denied")) {
        throw Error(
          `Permission denied writing to "${key}". Check the host machine file system permissions.`
        );
      }
      throw err;
    }

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
    const forceDownload = !!ctx.input.query.download;
    const isSignedRequest = !!ctx.input.query.sig;
    const { isPublicBucket, fileName } = AttachmentHelper.parseKey(key);
    const skipAuthorize = isPublicBucket || isSignedRequest;
    const cacheHeader = "max-age=604800, immutable";
    let contentType =
      (fileName ? mime.lookup(fileName) : undefined) ||
      "application/octet-stream";

    if (!skipAuthorize) {
      const attachment = await Attachment.findOne({
        where: { key },
        rejectOnEmpty: true,
      });
      authorize(actor, "read", attachment);
      contentType = attachment.contentType;
    }

    ctx.set("Cache-Control", cacheHeader);
    ctx.set("Content-Type", contentType);
    ctx.attachment(fileName, {
      type: forceDownload
        ? "attachment"
        : FileStorage.getContentDisposition(contentType),
    });

    // Handle byte range requests
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests
    const stats = await (FileStorage as LocalStorage).stat(key);
    const range = getByteRange(ctx, stats.size);

    if (range) {
      ctx.set("Content-Length", String(range.end - range.start + 1));
      ctx.set(
        "Content-Range",
        `bytes ${range.start}-${range.end}/${stats.size}`
      );
    } else {
      ctx.set("Content-Length", String(stats.size));
    }

    ctx.body = await FileStorage.getFileStream(key, range);
  }
);

function getByteRange(
  ctx: APIContext<T.FilesGetReq>,
  size: number
): { start: number; end: number } | undefined {
  const { range } = ctx.headers;
  if (!range) {
    return;
  }

  const match = range.match(/bytes=(\d+)-(\d+)?/);
  if (!match) {
    return;
  }

  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10) || size - 1;

  return { start, end };
}

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
