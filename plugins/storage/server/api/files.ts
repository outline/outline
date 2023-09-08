import Router from "koa-router";
import { bytesToHumanReadable } from "@shared/utils/files";
import env from "@server/env";
import {
  AuthenticationError,
  InvalidRequestError,
  NotFoundError,
} from "@server/errors";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Attachment, Team } from "@server/models";
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

    const id = key.split("/")[2];
    const attachment = await Attachment.findByPk(id, { rejectOnEmpty: true });

    if (!attachment) {
      throw NotFoundError("Supplied file path doesn't exist");
    }

    if (attachment.isPrivate) {
      const team = await Team.findByPk(actor.teamId, { rejectOnEmpty: true });
      authorize(actor, "createAttachment", team);
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
      const id = key.split("/")[2];
      attachment = await Attachment.findByPk(id, { rejectOnEmpty: true });
    } else {
      attachment = await Attachment.findBySignature(sig!);
    }

    if (!attachment) {
      throw NotFoundError("File doesn't exist");
    }

    if (attachment.isPrivate) {
      if (!actor) {
        throw AuthenticationError();
      }
      authorize(actor, "read", attachment);
    }

    const fileName = attachment.key.split("/")[3];
    ctx.set("Content-Type", attachment.contentType);
    ctx.attachment(fileName);
    ctx.body = attachment.stream;
  }
);

export default router;
