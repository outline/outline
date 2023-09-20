import Router from "koa-router";
import env from "@server/env";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import multipart from "@server/middlewares/multipart";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { Attachment } from "@server/models";
import { authorize } from "@server/policies";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
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

    const attachment = await Attachment.findByKey(key);

    if (attachment.isPrivate) {
      authorize(actor, "createAttachment", actor.team);
    }

    await attachment.overwriteFile(file);

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
    const { key, sig } = ctx.input.query;
    const actor = ctx.state.auth.user;
    let attachment: Attachment | null;

    if (key) {
      attachment = await Attachment.findByKey(key);

      if (attachment.isPrivate) {
        authorize(actor, "read", attachment);
      }
    } else if (sig) {
      attachment = await Attachment.findBySignature(sig);
    } else {
      throw ValidationError("Must provide either key or signature");
    }

    ctx.set("Content-Type", attachment.contentType);
    ctx.attachment(attachment.name);
    ctx.body = attachment.stream;
  }
);

export default router;
