import Router from "koa-router";
import { bytesToHumanReadable } from "@shared/utils/files";
import env from "@server/env";
import { AuthenticationError, InvalidRequestError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Attachment } from "@server/models";
import { authorize } from "@server/policies";
import { APIContext } from "@server/types";
import { getFileFromRequest } from "@server/utils/koa";
import { createRootDirForLocalStorage } from "../utils";
import * as T from "./schema";

createRootDirForLocalStorage();

const router = new Router();

router.post(
  "files.create",
  auth(),
  validate(T.FilesCreateSchema),
  async (ctx: APIContext<T.FilesCreateReq>) => {
    if (!ctx.is("multipart/form-data")) {
      throw InvalidRequestError("Request type must be multipart/form-data");
    }
    const file = getFileFromRequest(ctx.request);
    if (!file) {
      throw InvalidRequestError("Request must include a file parameter");
    }

    if (
      env.FILE_STORAGE_UPLOAD_MAX_SIZE &&
      file.size > env.FILE_STORAGE_UPLOAD_MAX_SIZE
    ) {
      throw InvalidRequestError(
        `The selected file was larger than the ${bytesToHumanReadable(
          env.FILE_STORAGE_UPLOAD_MAX_SIZE
        )} maximum size`
      );
    }

    const { key } = ctx.input.body;
    const actor = ctx.state.auth.user;

    const attachment = await Attachment.findByKey(key);

    if (attachment.isPrivate) {
      authorize(actor, "createAttachment", actor.team);
    }

    await attachment.saveFile(file);

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
    } else {
      attachment = await Attachment.findBySignature(sig!);
    }

    if (attachment.isPrivate) {
      if (!actor) {
        throw AuthenticationError();
      }
      authorize(actor, "read", attachment);
    }

    ctx.set("Content-Type", attachment.contentType);
    ctx.attachment(attachment.name);
    ctx.body = attachment.stream;
  }
);

export default router;
